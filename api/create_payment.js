// [create_payment.js] - Função Serverless FINAL E DIAGNÓSTICA

const { MercadoPagoConfig, Payment } = require('mercadopago');

// --- LEITURA DO TOKEN DE AMBIENTE ---
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; 

let client;
let paymentService;

// Inicializa o cliente APENAS se o token estiver presente (VERIFICAÇÃO DE SEGURANÇA)
if (ACCESS_TOKEN) {
    client = new MercadoPagoConfig({
        accessToken: ACCESS_TOKEN,
    });
    paymentService = new Payment(client);
}


// O Vercel usa esta função exportada como ponto de entrada da API
module.exports = async (req, res) => {
    
    // --- 1. CONFIGURAÇÃO CORS E OPTIONS (DEVE SER EXECUTADA PRIMEIRO) ---
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        // Se for um pré-voo CORS, responde 200 OK imediatamente.
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }
    // --- FIM CONFIGURAÇÃO CORS ---

    // --- 2. VERIFICAÇÃO DE FALHA DO CLIENTE ---
    if (!ACCESS_TOKEN || !paymentService) {
        console.error("ERRO CRÍTICO: MP_ACCESS_TOKEN está faltando ou falhou na inicialização.");
        return res.status(500).json({ 
            error: 'Falha na Inicialização da API de Pagamento. Verifique a variável de ambiente MP_ACCESS_TOKEN no Vercel.',
            code: 'TOKEN_MISSING' 
        });
    }
    // --- FIM VERIFICAÇÃO ---

    try {
        const { transaction_amount, description, payer, payment_method_id } = req.body; 

        if (!transaction_amount || !payer || payment_method_id !== 'pix') {
            return res.status(400).json({ error: 'Dados da transação incompletos ou inválidos.' });
        }
        
        const paymentData = {
            transaction_amount: Number(transaction_amount),
            description: description || 'Pagamento de Projeto',
            payment_method_id: 'pix',
            payer: payer
        };

        const result = await paymentService.create({ body: paymentData });
        
        // SUCESSO
        res.status(200).json({
            success: true,
            qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
            qr_code_text: result.point_of_interaction?.transaction_data?.qr_code,
            payment_id: result.id
        });

    } catch (error) {
        console.error('Erro fatal ao criar pagamento PIX:', error);
        
        if (error.status === 401) {
             return res.status(401).json({ error: 'Erro de Autenticação na API do Mercado Pago. Verifique seu ACCESS_TOKEN.' });
        }
        
        const mpError = error.cause && error.cause.length > 0 ? error.cause[0] : null;

        res.status(500).json({
            success: false,
            error: mpError ? `MP_ERROR ${mpError.code}: ${mpError.description}` : 'Erro interno ao processar o pagamento'
        });
    }
};