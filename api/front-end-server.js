const express = require('express');
const path = require('path');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const cors = require('cors');

const app = express();
const port = 3001;

// Configuração do MercadoPago
const client = new MercadoPagoConfig({ 
    accessToken: 'TEST-8155657262249649-091319-a2647f3eeb5a3e68df32ae7aeac4ce0e-290268833',
    options: {
        integratorId: 'dev_aa2d89add88111ebb2fb0242ac130004'
    }
});
const payment = new Payment(client);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint para criar pagamento PIX
app.post('/create_pix_payment', async (req, res) => {
    try {
        const { amount, description, email, firstName, lastName, identification } = req.body;

        const paymentData = {
            transaction_amount: parseFloat(amount),
            description: description || 'Pagamento via PIX',
            payment_method_id: 'pix',
            payer: {
                email: email,
                first_name: firstName,
                last_name: lastName,
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

        // Retorna os dados necessários para o frontend
        res.json({
            success: true,
            payment_id: result.id,
            status: result.status,
            qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
            qr_code: result.point_of_interaction?.transaction_data?.qr_code,
            ticket_url: result.point_of_interaction?.transaction_data?.ticket_url
        });

    } catch (error) {
        console.error('Erro ao criar pagamento PIX:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para verificar status do pagamento
app.get('/payment_status/:payment_id', async (req, res) => {
    try {
        const { payment_id } = req.params;
        const result = await payment.get({ id: payment_id });
        
        res.json({
            success: true,
            status: result.status,
            status_detail: result.status_detail
        });
    } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});