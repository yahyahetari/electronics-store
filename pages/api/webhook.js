import { Order } from "@/models/Order";
import { Product } from "@/models/Products";
import { buffer } from "micro";

const stripe = require('stripe')(process.env.STRIPE_SK);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const SHIPPING_COST = 2000;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const buf = await buffer(req);

    let event;
    try {
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    } catch (err) {
        return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const metadata = session.metadata;
        const paid = session.payment_status === 'paid';

        if (paid) {
            try {
                // Inside the webhook handler
                const cartItems = JSON.parse(metadata.cartItems);
                const orderItems = cartItems.map(item => ({
                    productId: item.id,
                    title: item.title,
                    quantity: item.quantity,
                    price: item.price,
                    properties: item.properties,
                    image: item.image
                }));

                const totalAmount = orderItems.reduce((sum, item) =>
                    sum + (item.price * item.quantity), 0) + SHIPPING_COST / 100;

                const orderDoc = await Order.create({
                    items: orderItems,
                    totalAmount,
                    firstName: metadata.firstName,
                    lastName: metadata.lastName,
                    email: metadata.email,
                    phone: metadata.phone,
                    address: metadata.address,
                    address2: metadata.address2,
                    state: metadata.state,
                    city: metadata.city,
                    country: metadata.country,
                    postalCode: metadata.postalCode,
                    notes: metadata.notes,
                    shippingCost: SHIPPING_COST / 100,
                    paid: true,
                    paymentId: session.payment_intent
                });


                // Update product stock
                for (const item of cartItems) {
                    const product = await Product.findById(item.id);
                    if (product) {
                        const variantIndex = product.variants.findIndex(v =>
                            Object.entries(item.properties).every(([key, value]) =>
                                v.properties[key]?.[0] === value
                            )
                        );

                        if (variantIndex !== -1) {
                            product.variants[variantIndex].stock -= item.quantity;
                            await product.save();
                        }
                    }
                }
            } catch (err) {
                console.error('Order processing error:', err);
                return res.status(500).json({ message: 'Error processing order' });
            }
        }
    }

    res.json({ received: true });
}

export const config = {
    api: {
        bodyParser: false,
    },
};
