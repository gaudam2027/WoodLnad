function validationWallet(data){
    
    if(data.amount||data.amount<0){
        
    }

    if (!data.amount || isNaN(data.amount) || Number(data.amount) <= 0) {
    return { errMsg: 'Please enter a valid amount' };
    }

    if (!data.paymentMethod || !['Upi', 'Credit-Card','Net-Banking'].includes(data.paymentMethod)) {
        return { errMsg: 'Please select a valid payment method' };
    }

    return { errMsg: null };

}


module.exports = {
    validationWallet
}