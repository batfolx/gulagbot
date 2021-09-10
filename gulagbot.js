require('dotenv').config();
const { driver, api } = require('@rocket.chat/sdk');
const HOST = process.env.ROCKETCHAT_URL;
const USER = process.env.ROCKETCHAT_USER;
const PASS = process.env.ROCKETCHAT_PASSWORD;
const SSL = process.env.USESSL;
const ROOMS = ['gulag', 'general'];
let TIMEOUT = process.env.TIMEOUT;
if (TIMEOUT === undefined || TIMEOUT === null) {
    TIMEOUT = (1000 * 60 * 1); // 1s * 60sec in minute * 1 minutes timeout time
}

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

/**
 * Callback for the processing of messages.
 * @param err If something went wrong.
 * @param message The message itself.
 * @param messageOptions Where the options came from.
 * @returns {Promise<void>} unused
 */
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
                const adminInfo = await getAdmins();
                // const admins = adminInfo['admins'];

                // these are the admins ID's in the server
                const adminIds = adminInfo['ids'];
                // don't listen to anybody who is not an admin
                if (!adminIds.includes(userId)) {
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

/**
 * Gets the admins of the server.
 * @returns {Promise<{ids: *[], admins: *[]}>} A dictionary containing two keys of lists of the ids of
 * the admins and the admins usernames.
 */
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

/**
 * Adds users to the Gulag.
 * @param roomId The room ID of the Gulag.
 * @param users The list of usernames to add.
 * @param userIds The list of user ID's to remove after the TIMEOUT variable expires.
 * @returns {Promise<void>} unused
 */
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
        await api.post('method.call/addUsersToRoom', request);
        userIds.forEach(function (user, index) {
            setTimeout(function() {
                removeUserFromGulag(roomId, user, users[index]).catch(function(e) {
                    console.log('Error in removing', user, 'with error', e.toString());
                });
            }, TIMEOUT);
        });

    } catch (e) {
        console.log('Error in adding user to the Gulag', e.toString());
    }
}


/**
 * Removes a user from the Gulag.
 * @param roomId The room ID of the Gulag.
 * @param userId The userId of the user to remove from the Gulag.
 * @param username The username of the user. Only meant for logging purposes if something
 * goes wrong.
 * @returns {Promise<void>} unused
 */
async function removeUserFromGulag(roomId, userId, username) {
    let data = {roomId: roomId, userId: userId};
    try {
        await api.post('groups.kick', data);
    } catch (e) {
        console.log('Failed to remove', username, 'from the gulag');
    }
}

gulagbot();
