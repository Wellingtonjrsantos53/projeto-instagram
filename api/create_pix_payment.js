// [create_pix_payment.js] - Adaptado do seu código funcional para Vercel Serverless

const { MercadoPagoConfig, Payment } = require('mercadopago');
const crypto = require('crypto'); // Usado para idempotencyKey

// O Vercel define variáveis de ambiente na execução (Token de produção/teste)
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; 
// O Vercel não precisa do integrador se o token for um token de acesso regular

let paymentService;

if (ACCESS_TOKEN) {
    try {
        const client = new MercadoPagoConfig({
            accessToken: ACCESS_TOKEN,
        });
        paymentService = new Payment(client);
    } catch (e) {
        console.error('Falha ao inicializar o cliente MP (Token pode estar errado):', e.message);
    }
}


module.exports = async (req, res) => {
    
    // --- Configuração CORS (Essencial para comunicação no Vercel) ---
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        // O erro 405 do Vercel é resolvido por esta linha
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }
    
    if (!paymentService) {
        return res.status(500).json({ 
            error: 'Falha de configuração interna: Token do Mercado Pago ausente ou inválido.'
        });
    }
    // --- Fim Configuração ---

    try {
        // CAMPOS ESPERADOS PELO CÓDIGO FUNCIONAL (front-end-server.TXT):
        const { amount, description, email, firstName, lastName, identification } = req.body; // 
        
        // Estrutura de dados conforme o seu código funcional
        const paymentData = {
            transaction_amount: parseFloat(amount), // 
            description: description || 'Pagamento via PIX',
            payment_method_id: 'pix',
            payer: { // [cite: 5]
                email: email,
                first_name: firstName,
                last_name: lastName,
                identification: identification ? {
                    type: identification.type || 'CPF',
                    number: identification.number // [cite: 6]
                } : undefined
            }
        };

        const requestOptions = {
            idempotencyKey: crypto.randomUUID(), // [cite: 6]
        };

        const result = await paymentService.create({ 
            body: paymentData, 
            requestOptions // [cite: 7]
        });
        
        // SUCESSO: Retorna os dados necessários para o frontend
        res.status(200).json({
            success: true,
            payment_id: result.id,
            qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
            qr_code_text: result.point_of_interaction?.transaction_data?.qr_code,
            // [cite: 7, 8]
        });

    } catch (error) {
        console.error('Erro fatal ao criar pagamento PIX:', error); // [cite: 9]
        // Retorna o erro exato do Mercado Pago
        res.status(500).json({
            success: false,
            error: error.message // [cite: 10]
        });
    }
};