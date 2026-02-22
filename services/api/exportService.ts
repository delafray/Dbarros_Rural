import { supabase } from '../supabaseClient';

export const exportService = {
    /**
     * Fetches all photo records for a specific user and triggers a .txt file download
     * formatted cleanly for AI parsing.
     * @param userId The ID of the user to export
     * @param userName The name of the user (used for the filename and header)
     */
    async exportUserHistoryToTXT(userId: string, userName: string): Promise<void> {
        try {
            // 1. Fetch all photos for this user
            // We only need specific fields for the txt export to keep it clean
            const { data: photos, error } = await supabase
                .from('photos')
                .select(`
          name,
          url,
          video_url,
          local_path,
          storage_location,
          created_at,
          tags ( name )
        `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching user photos for export:', error);
                throw new Error('Falha ao buscar os registros do usuário para exportação.');
            }

            if (!photos || photos.length === 0) {
                throw new Error('Este usuário não possui nenhum registro cadastrado no sistema.');
            }

            // 2. Format the data into a clean, AI-readable text format
            const generationDate = new Date().toLocaleString('pt-BR');

            let txtContent = `=================================================================\n`;
            txtContent += `PROMPT DE MAPEAMENTO PARA INTELIGÊNCIA ARTIFICIAL\n`;
            txtContent += `=================================================================\n`;
            txtContent += `INSTRUÇÃO PARA A IA: "Você é um assistente de migração de dados. 
O arquivo abaixo contém a lista completa de ativos de acervo (fotos e vídeos) de um funcionário. 
Cada registro possui um 'Caminho Local (Rede/Computador)' e um 'Servidor / HD Físico Original'. 
Caso este usuário queira reconstruir este catálogo em outro sistema ou localizar estes 
arquivos fisicamente, use estes metadados para mapear a posição exata de cada arquivo 
nos diretórios corporativos citados."\n`;
            txtContent += `=================================================================\n\n`;

            txtContent += `HISTÓRICO DE ACERVO - RELATÓRIO DE TRANSIÇÃO\n`;
            txtContent += `=================================================================\n`;
            txtContent += `Usuário Responsável: ${userName}\n`;
            txtContent += `Total de Registros: ${photos.length}\n`;
            txtContent += `Data da Exportação: ${generationDate}\n`;
            txtContent += `=================================================================\n\n`;

            photos.forEach((photo: any, index: number) => {
                // Format creation date
                const dateObj = new Date(photo.created_at);
                const formattedDate = dateObj.toLocaleDateString('pt-BR');

                // Format tags if they exist
                const tagNames = photo.tags ? photo.tags.map((t: any) => t.name).join(', ') : 'Nenhuma categoria';

                txtContent += `--- REGISTRO #${index + 1} ---\n`;
                txtContent += `Nome/Título: ${photo.name || 'Sem título'}\n`;
                txtContent += `Data do Cadastro: ${formattedDate}\n`;
                txtContent += `Categorias Corporativas: ${tagNames}\n`;

                if (photo.local_path) {
                    txtContent += `Caminho Local (Rede/Computador): ${photo.local_path}\n`;
                } else {
                    txtContent += `Caminho Local: [Não informado]\n`;
                }

                if (photo.storage_location) {
                    txtContent += `Servidor / HD Físico Original: ${photo.storage_location}\n`;
                } else {
                    txtContent += `Servidor / HD Físico Original: [Não informado]\n`;
                }

                if (photo.video_url) {
                    txtContent += `Link do Video (Referência): ${photo.video_url}\n`;
                }

                txtContent += `URL Preview na Nuvem: ${photo.url}\n`;
                txtContent += `\n`;
            });

            txtContent += `=================================================================\n`;
            txtContent += `FIM DO RELATÓRIO\n`;
            txtContent += `=================================================================\n`;

            // 3. Create Blob and trigger download
            const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
            const safeUserName = userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `historico_acervo_${safeUserName}_${new Date().getTime()}.txt`;

            // Create a temporary link element
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';

            // Append to html link element page
            document.body.appendChild(link);

            // Start download
            link.click();

            // Clean up and remove the link
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error: any) {
            console.error("Export Service Error:", error);
            throw error;
        }
    }
};
