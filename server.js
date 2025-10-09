// Importa os módulos necessários
const express = require('express');
const bodyParser = require('body-parser');
const mercadopago = require('mercadopago');
const cors = require('cors'); // Habilita o CORS para permitir requisições do front-end

// Cria uma nova aplicação Express
const app = express();
const port = 3000; // Porta do servidor

// Use middlewares
app.use(bodyParser.json());
app.use(cors()); // Habilita o CORS para todas as origens (ajuste em produção)

// Configura o Mercado Pago com sua chave de acesso.
// ATENÇÃO: Substitua 'SUA_CHAVE_DE_ACESSO_AQUI' pela sua chave real do Mercado Pago.
const mp = new mercadopago.MercadoPagoConfig({
  accessToken: 'TEST-8155657262249649-091319-a2647f3eeb5a3e68df32ae7aeac4ce0e-290268833',
});

// Endpoint para criar um pagamento via Pix ou Cartão de Crédito
app.post('/create_payment', async (req, res) => {
    try {
        const { transaction_amount, description, payer, payment_method_id } = req.body;

        let paymentResult;

        if (payment_method_id === 'pix') {
            // Lógica para pagamento via Pix
            const paymentData = {
                transaction_amount: Number(transaction_amount),
                description: description,
                payment_method_id: 'pix',
                payer: {
                    email: payer.email,
                    first_name: payer.first_name,
                    last_name: payer.last_name,
                    identification: {
                        type: 'CPF',
                        number: payer.identification.number
                    }
                }
            };
            paymentResult = await mp.payment.create({ body: paymentData });
            
            // Retorna o QR Code e o código para o front-end
            const qrCodeBase64 = paymentResult.body.point_of_interaction.transaction_data.qr_code_base64;
            const qrCodeText = paymentResult.body.point_of_interaction.transaction_data.qr_code;
            res.json({ qr_code_base64: qrCodeBase64, qr_code_text: qrCodeText });

        } else if (payment_method_id === 'credit_card') {
            // Lógica para pagamento via Cartão de Crédito
            const paymentData = {
                transaction_amount: Number(transaction_amount),
                description: description,
                payment_method_id: 'master', // Exemplo de ID de método de pagamento
                installments: 1, // Exemplo de parcelas
                payer: {
                    email: payer.email,
                    first_name: payer.first_name,
                    last_name: payer.last_name,
                    identification: {
                        type: 'CPF',
                        number: payer.identification.number
                    }
                }
            };
            paymentResult = await mp.payment.create({ body: paymentData });

            // Retorna o resultado para o front-end (informações de aprovação, etc.)
            res.json({ status: paymentResult.body.status, status_detail: paymentResult.body.status_detail });
        } else {
            res.status(400).json({ error: 'Método de pagamento não suportado' });
        }

        console.log("Pagamento criado com sucesso:", paymentResult.body.id);

    } catch (error) {
        console.error("Erro ao criar o pagamento:", error);
        res.status(500).json({ error: 'Erro ao processar o pagamento' });
    }
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log("Pressione Ctrl+C para parar o servidor.");
});
