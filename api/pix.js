const express = require('express');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const cors = require('cors');
const crypto = require('crypto'); // necessário para gerar idempotencyKey
const bodyParser = require('body-parser'); // Importa body-parser para compatibilidade

const app = express();

// ===============================
// 🔑 Configuração do MercadoPago
// ===============================
// Nota: Em produção, o accessToken deve vir de uma Variável de Ambiente do Vercel!
const client = new MercadoPagoConfig({
    // Utilize process.env.MERCADOPAGO_ACCESS_TOKEN em produção
    accessToken: 'APP_USR-8155657262249649-091319-ee52419ad3994e7b101524cd6c6fd5ee-290268833',
    options: {
        integratorId: 'dev_aa2d89add88111ebb2fb0242ac130004'
    }
});
const payment = new Payment(client);

// ===============================
// 🚀 Middlewares
// ===============================
// É crucial que o middleware 'express.json()' esteja no app que você exporta
app.use(cors());
app.use(express.json()); 
app.use(bodyParser.json()); // Adicione body-parser para robustez

// ===============================
// 💸 Endpoint: Criar pagamento PIX
// A rota é definida aqui. O Vercel a expõe em /api/pix/create_pix_payment
// ===============================
app.post('/create_pix_payment', async (req, res) => {
    try {
        // Recebe o novo campo 'phone'
        const { amount, description, email, firstName, lastName, identification, phone } = req.body;

        // Estrutura o objeto de telefone (espera DDD + Número)
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

        const result = await payment.create({ body: paymentData, requestOptions });

        // ✅ Retorna dados necessários para o frontend
        res.json({
            success: true,
            payment_id: result.id,
            status: result.status,
            qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
            // O Mercado Pago retorna a chave Copia e Cola no campo qr_code
            qr_code_text: result.point_of_interaction?.transaction_data?.qr_code, 
            ticket_url: result.point_of_interaction?.transaction_data?.ticket_url
        });

    } catch (error) {
        console.error('Erro ao criar pagamento PIX:', error);
        
        // Tentativa de formatar o erro para visualização no frontend
        let errorDetail = 'Erro desconhecido ao processar pagamento.';
        if (error.status) {
            errorDetail = `Erro MP (Status ${error.status}): ${error.message}`;
        } else if (error.message) {
             errorDetail = `Erro: ${error.message}`;
        }

        res.status(500).json({
            success: false,
            error: errorDetail
        });
    }
});

// ===============================
// EXPORTAÇÃO CRÍTICA PARA O VERCEL
// O Vercel usará esta exportação como sua função Serverless (Lambda)
// ===============================
module.exports = app;