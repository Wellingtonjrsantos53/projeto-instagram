// [create_payment.js] - Função Serverless FINAL e Robusta

const { MercadoPagoConfig, Payment } = require('mercadopago');

// O Vercel define variáveis de ambiente na execução
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; 

let client;
let paymentService;

// VERIFICAÇÃO DE INICIALIZAÇÃO: Inicializa o cliente MP
if (ACCESS_TOKEN) {
    try {
        client = new MercadoPagoConfig({
            accessToken: ACCESS_TOKEN,
        });
        paymentService = new Payment(client);
    } catch (e) {
        console.error('Falha ao inicializar o cliente MP:', e.message);
    }
}


module.exports = async (req, res) => {
    
    // --- 1. CONFIGURAÇÃO CORS E OPTIONS ---
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Adicionado Authorization por segurança

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }
    // --- FIM CONFIGURAÇÃO CORS ---

    // --- 2. VERIFICAÇÃO DE FALHA DO CLIENTE ---
    if (!paymentService) {
        console.error("ERRO CRÍTICO: Token MP_ACCESS_TOKEN ausente ou inválido.");
        // Retorna 500 para indicar falha interna do servidor (Token)
        return res.status(500).json({ 
            error: 'Falha de configuração interna: Token do Mercado Pago ausente ou inválido.',
            code: 'TOKEN_SETUP_FAILED'
        });
    }
    // --- FIM VERIFICAÇÃO ---

    try {
        const { transaction_amount, description, payer, payment_method_id } = req.body; 

        // Adicionando um log para depuração final
        console.log(`Tentando criar PIX para: R$${transaction_amount} com tipo de documento: ${payer.identification.type}`);
        
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
        
        // Retorna a mensagem de erro do Mercado Pago (se existir)
        const mpError = error.cause && error.cause.length > 0 ? error.cause[0] : null;

        res.status(500).json({
            success: false,
            error: mpError ? `MP_ERROR ${mpError.code}: ${mpError.description}` : 'Erro interno ao processar o pagamento'
        });
    }
};