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

const isBlock = async (req, res, next) => { // is blocked problem here 
  try {
    req.session.userId = req.session.passport?.user || req.session.user?._id;
    console.log( req.session.userId )
    if (!req.session.userId) {
      return next(); 
    }

    const user = await User.findOne({ _id: req.session.userId, isBlocked: false });

    if (user) {
      next();
    } else {
      req.session.destroy();
      next(); // Continue, but user is effectively treated as unauthenticated
    }
  } catch (err) {
    console.error('Error in isBlock middleware:', err);
    next(err);
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
    isBlock
}