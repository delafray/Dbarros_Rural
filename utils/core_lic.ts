export const _0x4d2a = "VG9kb3MgZGlyZWl0b3MgYnk6";
export const _0x1f8b = "cm9uYWxkb0Byb25hbGRvYm9yYmEuY29tLmJy";

export const getSystemInfo = () => {
    try {
        return {
            label: atob(_0x4d2a),
            contact: atob(_0x1f8b)
        };
    } catch (e) {
        return {
            label: "System Info",
            contact: "Contact Support"
        };
    }
};
