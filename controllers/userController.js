const BaseResponse = require('../models/BaseResponse');
const Errors = require('../models/Errors');
const User = require('../models/User');

// exports.updateAvatar = async (req, res) => {
//     try {
//         await User.findOneAndUpdate(
//             { _id: req.body.userID },
//             {
//                 $set: { urlImage: req.body. }
//             }
//         );
//         console.log('Change DatkMode');
//         return res.status(200).json(new BaseResponse(
//             1,
//             Date.now(),
//             [],
//             new Errors(
//                 200,
//                 "Successfully!",
//             )
//         ));
//     } catch (error) {
//         console.log(error.toString());
//         return res.status(500).json(new BaseResponse(
//             -1,
//             Date.now(),
//             []
//             ,
//             new Errors(
//                 500,
//                 error.toString(),
//             )

//         ));
//     }
// }

exports.changeDarkMode = async (req, res) => {
    try {
        await User.findOneAndUpdate(
            { _id: req.body.userID },
            {
                $set: { isDarkMode: req.body.isDarkMode }
            }
        );
        console.log('Change DatkMode');
        return res.status(200).json(new BaseResponse(
            1,
            Date.now(),
            [],
            new Errors(
                200,
                "Successfully!",
            )
        ));
    } catch (error) {
        console.log(error.toString());
        return res.status(500).json(new BaseResponse(
            -1,
            Date.now(),
            []
            ,
            new Errors(
                500,
                error.toString(),
            )

        ));
    }
}
