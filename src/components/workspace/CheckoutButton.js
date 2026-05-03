export function createCheckoutButton() {
  const section = document.createElement('section');
  section.className = 'task-input-panel';
  section.innerHTML = '<button id="razorpay-checkout" type="button">CheckoutButton</button>';

  const button = section.querySelector('#razorpay-checkout');

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100, currency: 'INR' })
      });
      if (!orderResponse.ok) {throw new Error('Order creation failed');}
      const order = await orderResponse.json();
      if (typeof window.Razorpay === 'undefined') {throw new Error('Razorpay SDK not loaded');}

      const razorpay = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: 'Daxini',
        handler: async (response) => {
          const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });
          if (!verifyResponse.ok) {throw new Error('Verification failed');}
        }
      });

      razorpay.open();
    } catch (error) {
      console.error('Checkout error:', error.message);
    } finally {
      button.disabled = false;
    }
  });

  return { element: section };
}
