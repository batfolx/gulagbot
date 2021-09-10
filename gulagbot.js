require('dotenv').config();
const { driver, api } = require('@rocket.chat/sdk');
const HOST = process.env.ROCKETCHAT_URL;
const USER = process.env.ROCKETCHAT_USER;
const PASS = process.env.ROCKETCHAT_PASSWORD;
const SSL = false;  // server uses https ?
const ROOMS = ['gulag', 'general'];
let TIMEOUT = process.env.TIMEOUT;
if (TIMEOUT === undefined || TIMEOUT === null) {
    TIMEOUT = (1000 * 60 * 1); // 1s * 60sec in minute * 1 minutes timeout time
}

console.log('TIMEOUT', TIMEOUT);
let myuserid;
let gulagRoomId;

const gulagbot = async () => {
    await driver.connect( { host: HOST, useSsl: SSL})
    myuserid = await driver.login({username: USER, password: PASS});
    // join rooms, subscribe to them and setup callback function
    await driver.joinRooms(ROOMS);
    await driver.subscribeToMessages();
    await driver.reactToMessages(processMessages);
    gulagRoomId = await driver.getRoomId(ROOMS[0]);
    await api.login();
}

// callback for incoming messages filter and processing
const processMessages = async(err, message, messageOptions) => {
    if (!err) {
        try {
            // filter our own message
            if (message.u._id === myuserid) return;

            const roomId = message._id;
            // can filter further based on message.rid
            const roomName = messageOptions.roomName;
            const messageContent = message.msg;
            const userId = message.u._id;
            if (messageContent.startsWith("!gulag")) {


                // could possibly cache this, but for right now this'll do
                const adminIds = await getAdmins();
                const admins = adminIds['admins'];
                const ids = adminIds['ids'];
                // don't listen to anybody who is not an admin
                if (!ids.includes(userId)) {
                    await driver.sendToRoom('You cannot send someone to the Gulag. You are not an Admin!', roomName);
                    return;
                }

                let mentions = message.mentions;
                if (mentions.length === 0) {
                    let response = 'You need to mention someone to send them to the Gulag.'
                    await driver.sendToRoom(response, roomName);
                } else {

                    let response = "Sending ";
                    let userNames = [];
                    let userIds = [];
                    mentions.forEach(function(mention) {
                        let name = mention.username;
                        response += name + ", "
                        userNames.push(name);
                        userIds.push(mention._id);
                    });
                    response += "to the Gulag.";
                    await addUsersToTheGulag(gulagRoomId, userNames, userIds);
                    await driver.sendToRoom(response, roomName);
                }
            }
        } catch(e) {
            console.log('Failed to process message with error', e.toString());
        }

    }
}

// Gets the Admins of the server
// because only an Admin can add people to the Gulag
async function getAdmins()  {
    try {
        let messagePayload = {
            "msg": "method",
            "method": "getUserRoles",
            "params": []
        }
        let data = {
            message: JSON.stringify(messagePayload)
        }
        const response = await api.post('method.call/getUserRoles', data);
        const responseMessage = JSON.parse(response.message);
        let users = responseMessage.result;
        let admins = [];
        let userIds = []

        users.forEach(function(user) {
            let roles = user.roles;
            roles.forEach(function(role) {
                // this user is an admin
                if (role.toLowerCase().trim() === 'admin') {
                    admins.push(user.username);
                    userIds.push(user._id);
                }
            });
        });

        return {'admins': admins, 'ids': userIds};
    } catch (e) {
        console.log('Error in getting user roles', e.toString());
        return {'admins': [], 'ids': []};
    }
}

// adds users to the gulag
async function addUsersToTheGulag(roomId, users, userIds) {
    try {
        let data = {
            "msg": "method",
            "method": "addUsersToRoom",
            params: [
                {
                    rid: roomId,
                    users: users
                }
            ]
        }
        let request = {
            'message': JSON.stringify(data)
        }
        const response = await api.post('method.call/addUsersToRoom', request);

        userIds.forEach(function (user, index) {
            setTimeout(function() {
                removeUserFromGulag(roomId, user, users[i]).catch(function(e) {
                    console.log('Error in removing', user, 'with error', e.toString());
                });
            }, TIMEOUT);
        });

    } catch (e) {
        console.log('Error in adding user to the Gulag', e.toString());
    }
}

async function removeUserFromGulag(roomId, userId, username) {

    let data = {roomId: roomId, userId: userId};
    try {
        await api.post('groups.kick', data);
    } catch (e) {
        console.log('Failed to remove', username, 'from the gulag');
    }


}

gulagbot();
