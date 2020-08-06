routes = require('express').Router();
const Sequelize = require("sequelize");
const multer = require("multer");
const aws = require("aws-sdk");
const multerConfig = require("./config/multer");
const path = require("path");
const { promisify } = require("util");
const fs = require("fs");
const PostModel = require("./models/post");
const configdb = require("./config/config.json");
const sequelize = new Sequelize(configdb.upload.database,
    configdb.upload.username,
    configdb.upload.password,
    {
        host: configdb.upload.host,
        dialect: configdb.upload.dialect
    });
const Post = PostModel(sequelize, Sequelize);

const s3 = new aws.S3();

routes.get('/posts', async(req, res) => {
    const posts  = await Post.findAll();
    return res.json(posts);
})

routes.post('/posts', multer(multerConfig).single("file"), async (req, res) => {
    let { originalname: name, size, key, location: url = '' } = req.file;
    if (!url){
        url = `${process.env.APP_URL}/files/${this.key}`;
    }
    const post = await Post.create({
        name: name,
        size: size,
        key: key,
        url : url
    })

    return res.json(post);
});

routes.delete('/posts/:id', async (req, res) => {
   const post = await Post.findByPk(req.params.id);
    if( process.env.STORAGE_TYPE === 's3') {
         await s3.deleteObject({
            Bucket: 'nsrupload',
            Key: post.key,
        }).promise()
    } else {
        await promisify(fs.unlink)(
            path.resolve(__dirname, "..", "temp", "uploads", post.key)
        );
    }
   await post.destroy();
   return res.send('Deleted successfully!');
});

module.exports = routes;