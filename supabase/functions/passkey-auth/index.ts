import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from "https://esm.sh/@simplewebauthn/server@9.0.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to convert Base64URL to Standard Base64 with padding
const base64UrlToStandard = (base64url: string): string => {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
        base64 += '=';
    }
    return base64;
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const url = new URL(req.url);
        const action = url.searchParams.get("action");

        // Dynamic RP ID: Must match the frontend domain
        const originHeader = req.headers.get("origin");
        const refererHeader = req.headers.get("referer");

        let rpID = url.hostname; // Fallback
        if (originHeader) {
            rpID = new URL(originHeader).hostname;
        } else if (refererHeader) {
            rpID = new URL(refererHeader).hostname;
        }

        const origin = originHeader || `https://${rpID}`;

        console.log(`Action: ${action}, rpID: ${rpID}, origin: ${origin}`);

        // Registration (Enrollment)
        if (action === "enroll-options") {
            const authHeader = req.headers.get("Authorization")!;
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
            if (userError || !user) throw new Error("Unauthorized");

            const options = await generateRegistrationOptions({
                rpName: "Galeria de Fotos",
                rpID,
                // userID must be a Uint8Array to be correctly encoded as Base64URL in the response
                userID: new TextEncoder().encode(user.id),
                userName: user.email!,
                attestationType: "none",
                authenticatorSelection: {
                    residentKey: "required", // Required for passwordless
                    userVerification: "required",
                    authenticatorAttachment: "platform",
                },
            });

            return new Response(JSON.stringify(options), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "enroll-verify") {
            const authHeader = req.headers.get("Authorization")!;
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
            if (userError || !user) throw new Error("Unauthorized");

            const { body, expectedChallenge } = await req.json();

            const verification = await verifyRegistrationResponse({
                response: body,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
            });

            if (verification.verified && verification.registrationInfo) {
                const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

                const { error: dbError } = await supabaseClient
                    .from("user_biometrics")
                    .insert({
                        user_id: user.id,
                        credential_id: btoa(String.fromCharCode(...credentialID)),
                        public_key: btoa(String.fromCharCode(...credentialPublicKey)),
                        counter,
                        friendly_name: body.id,
                    });

                if (dbError) throw dbError;

                return new Response(JSON.stringify({ verified: true }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            throw new Error("Verification failed");
        }

        // Authentication (Login)
        if (action === "login-options") {
            const { email } = await req.json();
            let credentials = [];
            let targetUserId = null;

            if (email) {
                console.log(`Looking up user for email: ${email}`);
                const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();
                if (listError) throw listError;
                const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

                if (targetUser) {
                    targetUserId = targetUser.id;
                    const { data: userCredentials } = await supabaseClient
                        .from("user_biometrics")
                        .select("credential_id")
                        .eq("user_id", targetUser.id);
                    credentials = userCredentials || [];
                }
            }

            const options = await generateAuthenticationOptions({
                rpID,
                allowCredentials: credentials.map(c => ({
                    id: Uint8Array.from(atob(c.credential_id), char => char.charCodeAt(0)),
                    type: "public-key",
                    transports: ["internal"],
                })),
                userVerification: "required",
            });

            return new Response(JSON.stringify({ options, userId: targetUserId }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "login-verify") {
            const { body, expectedChallenge, userId: providedUserId } = await req.json();

            let userId = providedUserId;

            // If userId wasn't provided (anonymous login), identify user from userHandle
            if (!userId && body.response.userHandle) {
                const standardHandle = base64UrlToStandard(body.response.userHandle);
                userId = atob(standardHandle);
            }

            if (!userId) throw new Error("Could not identify user from assertion");

            // body.id is Base64URL, but we store as standard Base64
            const standardCredentialId = base64UrlToStandard(body.id);

            const { data: credential } = await supabaseClient
                .from("user_biometrics")
                .select("*")
                .eq("user_id", userId)
                .eq("credential_id", standardCredentialId)
                .single();

            if (!credential) throw new Error("Credential not found for user");

            const verification = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                authenticator: {
                    credentialID: Uint8Array.from(atob(credential.credential_id), char => char.charCodeAt(0)),
                    credentialPublicKey: Uint8Array.from(atob(credential.public_key), char => char.charCodeAt(0)),
                    counter: credential.counter,
                },
            });

            if (verification.verified) {
                await supabaseClient
                    .from("user_biometrics")
                    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
                    .eq("id", credential.id);

                const { data: user } = await supabaseClient.auth.admin.getUserById(userId);
                const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
                    type: "magiclink",
                    email: user.user!.email!,
                });

                if (linkError) throw linkError;

                return new Response(JSON.stringify({
                    verified: true,
                    token_hash: linkData.properties.hashed_token
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            throw new Error("Login verification failed");
        }

        return new Response("Action not found", { status: 404, headers: corsHeaders });

    } catch (error) {
        console.error(`Edge Function Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
