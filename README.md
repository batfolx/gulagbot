# Gulag Bot
Sends people to the gulag in Rocket Chat


## Getting Started

### 1. Download the code


First, clone the repository and then `cd` into the directory.

### 2. Setup the packages and environment

Once in the `gulagbot` directory, you'll have to install the dependencies with the command

```
npm install
```

and you will also want to create a `.env` file with the variables needed to login to the bot.

```
touch .env
```

### 3. Create a bot user in your Rocket.Chat



### 4. The `.env` file

Since we don't want to push the bot's credentials to version control, we want to store it in the environment. This is 
what a sample `.env` file would look like for this code.

```
HOST=http://127.0.0.1:80
ROCKETUSER=MyBotUsername
ROCKETPASS=mypassword
BOTNAME=My Bot
```



