const User = require('../../model/userSchema');
const { getIO } = require('../../config/socket'); //for getting socket IO

const customerInfo = async (req, res) => {
  try {
    console.log('Fetching users');

    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    let page = parseInt(req.query.page) || 1;

    const limit = 3;

    //All userdata for (total cutomers,active customers,bloacked,etc)
    const allUserData = await User.find({})
    // Fetch user data
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*",$options: "i" } },
        { email: { $regex: ".*" + search + ".*",$options: "i" } }
      ]
    }).sort({createdOn:-1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    // Count the total number of users for pagination
    const count = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } }
      ]
    }).countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    // Pass data to the EJS view
    res.render("customers", {
      allUserData,
      users: userData,          
      searchQuery: search,
      totalPages: totalPages,   
      currentPage: page,        
    });
  } catch (error) {
    console.error("Error in customerInfo:", error.message);
    res.status(500).send("Server Error");
  }
}

const customerBlock = async (req, res) => {
  try {
    console.log('CB1');

    const { userId, block } = req.body;
    const isBlocked = block;

    if (!userId) {
      return res.json({ success: false, message: 'User ID missing' });
    }

    // Update user block status
    await User.updateOne({ _id: userId }, { $set: { isBlocked } });

    const io = getIO();

    // Emit socket event to the specific user
    io.to(`user_${userId}`).emit('user-block-status', { isBlocked: block });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    return res.status(500).render('pageerror');
  }
};




module.exports = {
  customerInfo,
  customerBlock
}
