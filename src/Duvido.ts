export = Duvido;

import DB = require("./DB");
import Facebook = require("./Facebook");
import MongoDB = require("mongodb");

module Duvido {
    export class User {
        userId : string;

        static fromId(userId : string) {
            var user = new User();
            user.userId = userId;
            return user;
        }

        static fromToken(token : string, callback : (err : Error, user : User) => void) {
            DB.users.findOne({tokens : token}, function(err : Error, user : any) {
                if (user === null) {
                    new Facebook(token).fetchMe(function(err : Error, userInfo : Facebook.User) {
                        if (err) { callback(err, null); return; }
                        var user = User.fromId(userInfo.id);
                        callback(null, user);
                        user.addToken(token, function(err : Error){});
                    });
                } else {
                    callback(null, User.fromId(user.userId));
                }
            });
        }

        addToken(token : string, callback : (err : Error) => void) {
            var key = {userId : this.userId};
            var data = {$addToSet: { tokens: token }, $set: {userId : this.userId}};
            DB.users.updateOne(key, data, {upsert: true}, function(err : Error, res : any) {
                callback(err);
            });
        }

        saveAvatarAsync(avatar : MongoDB.Binary) {
            var key = {userId : this.userId};
            var data = {$set: {userId : this.userId, avatar: avatar}};
            DB.users.updateOne(key, data, {upsert: true}, function(err : Error, res : any) {});
        }

        getAvatar(callback : (err : Error, buf : Buffer) => void) {
            var id = this.userId;
            DB.users.findOne({userId : id}, function(err : Error, user : any) {
                if (err) { callback(err, null); return; }
                if (user && user.avatar) {
                    var data : MongoDB.Binary = user.avatar;
                    var buff = data.read(0, data.length());
                    callback(null, buff);
                } else {
                    new Facebook().fetchAvatar(id, function(err : Error, buff : Buffer) {
                        if (err) { callback(err, null); return; }
                        callback(null, buff);
                        User.fromId(id).saveAvatarAsync(new MongoDB.Binary(buff));
                    });
                }
            });
        }
    }
}
