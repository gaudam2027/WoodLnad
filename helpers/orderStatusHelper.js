function calculateOrderStatus(orderItems,previousOrderStatus) {
  const statuses = orderItems.map(i => i.status);

  if (statuses.every(s => s === 'Returned' || s === 'Return Rejected'||s === 'Cancelled')) {
    return 'Returned';
  }

  if (statuses.includes('Return Request')) {
    return 'Return Request';
  }

  if (statuses.every(s => s === 'Cancelled')) {
    return 'Cancelled';
  }

  if (statuses.every(s => s === 'Delivered')) {
    return 'Delivered';
  }

  if (statuses.every(s => s === 'Ordered')) {
    return 'Ordered';
  }

  
  if (statuses.every(s => s === 'Shipped')) {
    return 'Shipped';
  }
  
  if (statuses.every(s => s === 'Pending')) {
    return 'Pending';
  }


  return previousOrderStatus // Fallback if no specific pattern matches
}

module.exports = { calculateOrderStatus };