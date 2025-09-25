function calculateRefundAmount(order, items) {
  if (!order || !items || items.length === 0) return 0;

  const totalAmount = order.totalPrice || 0; // before discount
  const discount = order.couponDiscount || 0;
  const discountRatio = totalAmount > 0 ? discount / totalAmount : 0;

  let refundAmount = 0;

  for (const item of items) {
    const itemBase = (item.price || 0) * (item.quantity || 1);
    const itemDiscount = itemBase * discountRatio;
    const refundablePrice = itemBase - itemDiscount;
    refundAmount += refundablePrice;
  }

  return Math.round(refundAmount); // round for currency
}

module.exports = {calculateRefundAmount};