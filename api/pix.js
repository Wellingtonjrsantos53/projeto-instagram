const express = require('express');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const cors = require('cors');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();

// ===============================
// 🔑 Configuração do MercadoPago
// ===============================
const client = new MercadoPagoConfig({
    // Lembre-se de usar variáveis de ambiente no Vercel para esta chave!
    accessToken: 'APP_USR-8155657262249649-091319-ee52419ad3994e7b101524cd6c6fd5ee-290268833',
    options: {
        integratorId: 'dev_aa2d89add88111ebb2fb0242ac130004'
    }
});
const payment = new Payment(client);

// ===============================
// 🚀 Middlewares
// ===============================
app.use(cors());
app.use(express.json()); 
app.use(bodyParser.json()); 

// ===============================
// 💸 Endpoint: Criar pagamento PIX
// ===============================
app.post('/create_pix_payment', async (req, res) => {
    try {
        const { amount, description, email, firstName, lastName, identification, phone } = req.body;

        const phoneData = phone && phone.length >= 10 ? {
            area_code: phone.substring(0, 2),
            number: phone.substring(2)
        } : undefined;

        const paymentData = {
            transaction_amount: parseFloat(amount),
            description: description || 'Pagamento via PIX',
            payment_method_id: 'pix',
            payer: {
                email: email,
                first_name: firstName,
                last_name: lastName,
                phone: phoneData,
                identification: identification ? {
                    type: identification.type || 'CPF',
                    number: identification.number
                } : undefined
            }
        };

        const requestOptions = {
            idempotencyKey: crypto.randomUUID(),
        };
        
        // --- LOG DE DEBUG 1: Dados Enviados ---
        console.log('Dados enviados ao MP:', JSON.stringify(paymentData, null, 2));

        const result = await payment.create({ body: paymentData, requestOptions });

        // ✅ Sucesso
        res.json({
            success: true,
            payment_id: result.id,
            status: result.status,
            qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
            qr_code_text: result.point_of_interaction?.transaction_data?.qr_code, 
            ticket_url: result.point_of_interaction?.transaction_data?.ticket_url
        });

    } catch (error) {
        
        // --- LOG DE DEBUG 2: Erro Detalhado do MP ---
        console.error('ERRO FATAL ao criar PIX (Mercado Pago API):');
        console.error(error); // Isso imprimirá todo o objeto de erro no console do Vercel!
        
        // Estrutura a resposta de erro para o Frontend
        const errorDetails = error.cause && error.cause.length > 0 ? error.cause.map(c => `${c.code}: ${c.description}`).join('; ') : 'Detalhes desconhecidos.';
        const httpStatus = error.status || 500;
        
        res.status(httpStatus).json({
            success: false,
            // Retorna o status HTTP e a descrição do erro (ex: "400: payer.email field is required")
            error: `Falha na API. Status: ${httpStatus}. Detalhes: ${errorDetails}` 
        });
    }
});

// ===============================
// EXPORTAÇÃO CRÍTICA PARA O VERCEL
// ===============================
module.exports = app;