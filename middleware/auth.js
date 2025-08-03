const User = require('../model/userSchema')

const userAuth = (req,res,next)=>{
  
  req.session.userId = req.session.passport?.user || req.session.user?._id
  
    if(req.session.userId){
        User.findById(req.session.userId)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect('/signIn')
            }
        })
        .catch(error=>{
            console.log('error in user auth middleware',error);
            res.status(500).send('Internal server error')
        })
    }else{
        res.redirect('/signIn')
    }
}

const userIslog = async(req,res,next)=>{
  req.session.userId = req.session.passport?.user || req.session.user?._id
  console.log(req.session.userId)
  const userData = await User.findOne({_id:req.session.userId,isBlocked:false});
  if(!userData){
    next()
  }else{
    res.redirect('/')
  }

 
}

const checkUserStatus = async (req, res, next) => {
  try {
    const userId = req.session.passport?.user || req.session?.user?._id;
    if (!userId) return next();

    const user = await User.findById(userId);
    if (!user) {
      if (req.session.passport) req.session.passport.user = null;
      if (req.session.user) req.session.user = null;
      return next();
    }

    if (user.isBlocked) {
      if (req.session.passport) req.session.passport.user = null;
      if (req.session.user) req.session.user = null;
      return next();
    }

    req.userData = user;
    next();
  } catch (error) {
    console.error('User status check middleware error:', error);
    next(error);
  }
};


const adminAuth = (req, res, next) => {
  
    if (req.session.admin) {
      
      User.findById(req.session.admin)
        .then(admin => {
          if (admin && admin.isAdmin) {
            
            next();
          } else {
            
            res.redirect('/admin/signin');
          }
        })
        .catch(error => {
          console.log('Error in adminAuth middleware:', error);
          res.status(500).send('Internal server error');
        });
    } else {
      res.redirect('/admin/signin');
    }
  };

module.exports = {
    userAuth,
    userIslog,
    adminAuth,
    checkUserStatus
}