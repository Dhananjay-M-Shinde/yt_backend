cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
  });
import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
          


const uploadOnCloudinary = async (localFilePath) =>{
    try {
        
        if(!localFilePath) return null

        // upload the file on cloudinary
        // const response = await cloudinary.uploader.upload(localFilePath, {
        //     resource_type: "auto"
        // })

        let response = undefined;
        await cloudinary.uploader.upload(localFilePath, 
                function(error, result) {
                    response = result;
                }
        );
        
        // console.log(response.url);
        fs.unlinkSync(localFilePath) // removing files once it is uploaded to cloudinary
        return response
    } catch (error) {
        // console.log(error);
        fs.unlinkSync(localFilePath) // this removes the locally saves temporary files as the upload operation failed
        
    }
}

export {uploadOnCloudinary}

// cloudinary.v2.uploader.upload("https://res.cloudinary.com/demo/video/upload/v1689235939/video_upload_example.mp4",
//   { resource_type: "video",
//     public_id: "video_upload_example"
//   }).then((data) => {
//     console.log(data.playback_url);
//   }).catch((err) => {
//     console.err(err)
//   });