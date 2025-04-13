const User = require('../model/userSchema')

const userAuth = (req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
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
    adminAuth
}