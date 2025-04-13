const User = require('../../model/userSchema');

const customerInfo = async (req, res) => {
  try {
    console.log('Fetching users');

    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }

    const limit = 3;

    // Fetch user data
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } }
      ]
    })
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
      users: userData,          
      searchQuery: search,      
      totalPages: totalPages,   
      currentPage: page,        
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
}

const cutomerBlocked = async(req,res)=>{
    try {
        
        let id = req.query.id;

        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/users')

    } catch (error) {
        
        res.render('pageerror');
    }
}

const cutomerUnblocked = async(req,res)=>{
    try {
        
        let id = req.query.id;

        await User.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect('/admin/users')

    } catch (error) {
        
        res.render('pageerror');
    }
}

module.exports = {
  customerInfo,
  cutomerBlocked,
  cutomerUnblocked
}
