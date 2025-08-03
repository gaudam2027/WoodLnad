const User = require('../../model/userSchema');
const Address = require('../../model/addressSchema');
const {validateAddress} =  require('../../helpers/validators/addressValidator')


const manageAddress = async (req, res) => {
  try {
    const user = req.session.userId || req.session.user?._id;
    const userData = await User.findOne({ _id: user, isBlocked: false });

    const addressDoc = await Address.findOne({ userId: user });

    const currentPage = parseInt(req.query.page) || 1;
    const perPage = 2;

    let paginatedAddresses = [];
    let totalAddresses = 0;
    let totalPages = 1;

    if (addressDoc && addressDoc.address.length > 0) {
      totalAddresses = addressDoc.address.length;
      totalPages = Math.ceil(totalAddresses / perPage);

      const startIndex = (currentPage - 1) * perPage;
      const endIndex = startIndex + perPage;

      paginatedAddresses = addressDoc.address.slice(startIndex, endIndex);
    }

    res.render('manageAddress', {
      user: userData,
      addresses: paginatedAddresses,
      currentPage,
      totalPages,
    });
  } catch (error) {
    console.log('Error loading address page:', error);
    res.status(500).send('Server error');
  }
};


const addAddress = async (req,res)=>{
    try {
        const newAddress = req.body
        const user = req.session.userId || req.session.user?._id
        const userData = await User.findOne({_id:user,isBlocked:false});
        const { isValid, errors } = validateAddress(newAddress);
        console.log(isValid, errors)
        
        //validation
        if (!isValid) {
          return res.status(400).json({ success: false, errors });
        }

        if (userData) {
        await Address.findOneAndUpdate(
        { userId: user },
        { $push: { address: newAddress } },
        { upsert: true } // creates the document if not found
      );

        res.status(200).json({ success: true });
    }else{
            res.status(400).json({success:false,message:"This user is been blocked or not found"});
        }
         

    } catch (error) {
        console.log('error while adding address');
         res.status(500).json({ message: "Error saving address", error});
        
    }
}


const editAddress = async (req, res) => {
  try {
    const {
      editingAddressId, 
      title,
      addressType,
      city,
      state,
      address,
      landmark,
      pincode,
      phone,
      altPhone,
      email
    } = req.body;



    const user = req.session.userId || req.session.user?._id;

    const userData = await User.findOne({ _id: user, isBlocked: false });

    const { isValid, errors } = validateAddress(req.body);
        
        

    if (!userData) {
      return res.status(400).json({ success: false, message: "User not found or blocked" });
    }

    //validation
    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }

    const updated = await Address.updateOne(
      { userId: user, "address._id": editingAddressId },
      {
        $set: {
          "address.$.title": title,
          "address.$.addressType": addressType,
          "address.$.city": city,
          "address.$.state": state,
          "address.$.address": address,
          "address.$.landmark": landmark,
          "address.$.pincode": pincode,
          "address.$.phone": phone,
          "address.$.altPhone": altPhone,
          "address.$.email": email,
        },
      }
    );

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Error editing address:", error);
    res.status(500).json({ message: "Error editing address", error });
  }
};


const deleteAddress = async (req,res)=>{
    try {
        
        const user = req.session.userId || req.session.user?._id
        const addressId = req.params.id;
        const userData = await User.findOne({_id:user,isBlocked:false});
        if (!userData) {
          return res.status(400).json({ success: false, message: "User not found or blocked" });
        }

        const result = await Address.updateOne(
          { userId: userData._id },
          { $pull: { address: { _id: addressId } } }
        );
         
        
        if (result.modifiedCount > 0) {
          return res.json({ success: true });
        } else {
          return res.status(400).json({ success: false, message: "Address not found" });
        }

    } catch (error) {
        console.log('error while deleting address');
         res.status(500).json({ message: "Error saving address", error});
        
    }
}


module.exports = {
    manageAddress,
    addAddress,
    editAddress,
    deleteAddress
}