const gmodconfig = require("./gmodconfig.json");
const Discord = require("discord.js");
const express = require('express')
const session = require("express-session");
const app = express();
const app2 = express();
const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');

const port = 3000;
const UserProfile = require("./models/user");
const ProductProifle = require("./models/product");
const WithdrawProifle = require("./models/withdraw");
const SupportHelp = require("./models/supportsection");
const DiscordProfile = require("./models/discord");
const steam = require('steam-login');
const bodyParser = require("body-parser");
const path = require('path');
const fs = require('fs')
const request = require('request')
var marked = require('marked');
var formidable = require("formidable")
const dirname = path.resolve()
const client = new Discord.Client();

const SteamAPI = require('steamapi');
const steamapi = new SteamAPI(gmodconfig.steamapi);


const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();

var http = require('http');
var https = require("https")


var cookieSession = require('cookie-session');
app.use(cookieSession({
    name: 'session',
    keys: ['gmodkey', 'gmodshopkey'],
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
}));

app.use( function (req, res, next) {
    if ( req.method == 'POST' && req.url == '/login' ) {
      if ( req.body.remember ) {
        req.session.cookie.maxAge = 30*24*60*60*1000; // Rememeber 'me' for 30 days
      } else {
        req.session.cookie.expires = false;
      }
    }
    next();
});

const UnitPay = require('unitpay');

var u = new UnitPay({
    secretKey: gmodconfig.unitpaysecret,
    publicKey: gmodconfig.unitpaypublic
});
// eyJ2ZXJzaW9uIjoiUDJQIiwiZGF0YSI6eyJwYXlpbl9tZXJjaGFudF9zaXRlX3VpZCI6Im41djN5NS0wMCIsInVzZXJfaWQiOiIzODA3MzMyMTA2NTYiLCJzZWNyZXQiOiI4ZDcwNmVkZWNmNjU5ZDM5OWVkZTM0YzZlNWI3NGUxMjZlZDU0NWEzYmE4MDNiOTFiMTYwYjk3NmU5MzE5Nzg2In19
const QiwiBillPaymentsAPI = require('@qiwi/bill-payments-node-js-sdk');
const SECRET_KEY = gmodconfig.qiwisecretkey;
const qiwiApi = new QiwiBillPaymentsAPI(SECRET_KEY);

mongoose.connect(gmodconfig.mongodburl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

client.on("ready", () => {
  console.log(`Bot is ready. (${client.guilds.cache.size} Guilds - ${client.channels.cache.size} Channels - ${client.users.cache.size} Users)`);
});

client.on("error", console.error);
client.on("warn", console.warn);

client.on('guildMemberAdd', async member => {

  var SiteUser = await DiscordProfile.findOne({ id: member.id });

  if (SiteUser) {
    member.roles.add(gmodconfig.verifyrole)
  }

  const channel = member.guild.channels.cache.get("836877333579038721");

  let welcome = new Discord.MessageEmbed()
    welcome.setColor("#2980b9")
    welcome.setTitle(`:white_check_mark: Новый пользователь!`);
    welcome.setDescription(`**${member.user.username}#${member.user.discriminator}** присоединился(-ась) к серверу!`)

  channel.send(welcome);
});

client.on("message", async (message) => {
  const reply = (...arguments) => message.channel.send(...arguments);

  if (message.author.bot) return;

  let prefix = "!"

  if (message.content.indexOf(prefix) !== 0) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command === "who" && args[0]) {
  	const whouser = await message.mentions.members.first()
  	if (!whouser) return
  	var storedapp = await DiscordProfile.findOne({ id: whouser.user.id });
  	if (!storedapp) {
  		let emb1 = new Discord.MessageEmbed()
    	    .setColor("#2980b9")
    	    .setDescription(`Аккаунт дискорд не связан с сайтом`)
    	    .setTimestamp()
    	message.channel.send(emb1)
  	} else {
  		var me = await UserProfile.findOne({ sid: storedapp.siteid });
  		if (!me) return
  		let emb2 = new Discord.MessageEmbed()
    	    .setColor("#2980b9")
    	    .setDescription(`Профиль ${me.nickname}\nhttps://gmodshop.ru/u/${storedapp.siteid}`)
    	    .setTimestamp()
    	message.channel.send(emb2)
  	}



  }

});

async function updatediscordsupport() {
    let channelname = client.guilds.cache.get("828296539582496799").channels.cache.get(gmodconfig.supporttagchannel);

    let activeticketdiscord = await SupportHelp.find({ status: 'response' });
    let waitticketdiscord = await SupportHelp.find({ status: 'wait' });

    supercount = await (waitticketdiscord.length + activeticketdiscord.length)

    channelname.setName(`Активно-${supercount}`)

}

client.on('ready', async () => {

  setInterval(async () => {

    const statusList = [
      { msg: `https://gmodshop.ru`, type: "PLAYING" },
      { msg: `gmodshop - лучший магазин аддонов`, type: "PLAYING" },
    ];

    const index = Math.floor(Math.random() * statusList.length + 1) - 1;
    await client.user.setActivity(statusList[index].msg, {
      type: statusList[index].type,
    });
  }, 15000);
})

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


app2.set('view engine', 'ejs');
app2.use(bodyParser.urlencoded({
    extended: true
}));
app2.use(bodyParser.json());

// app.use(express.static('public'))
// app.use(express.static(__dirname + '/public'));
// app.use('/public', express.static('public'));

app.use(require('express-session')({ resave: false, saveUninitialized: false, secret: 'gmodkey' }));
app.use(steam.middleware({
    realm: 'https://gmodshop.ru/', 
    verify: 'https://gmodshop.ru/verify',
    apiKey: gmodconfig.steamapi}
));

const renderTemplate = async (res, req, template, data = {}) => {
  var fitys = null
  var supermoderator = "rank rank-member"
  if (req.user) {
  	var me = await UserProfile.findOne({ sid: req.user.steamid });
  	fitys = me.isnotify
    supermoderator = me.rank
  }
  const baseData = {
    //bot: client,
    path: req.path,
    user: req.user == null ? null : req.user,
    fity: fitys,
    admin: supermoderator
  };
  const dataDir = path.resolve(`${process.cwd()}`);
  const templateDir = path.resolve(`${dataDir}${path.sep}views`);
  res.render(path.resolve(`${templateDir}${path.sep}${template}`), Object.assign(baseData, data));
};

const checkAuth = (req, res, next) => {
    if (req.user != null) return next();
    req.session.backURL = req.url;
    res.redirect('/authenticate')
}

app.get('/gay', function(req, res) {
  res.send(req.user == null ? 'not logged in' : 'hello ' + req.user.username).end();
});

app.get('/authenticate', steam.authenticate(), function(req, res) {
    res.redirect('/gay');
});

app.get('/verify', steam.verify(), async function(req, res) {
    var SiteUser = await UserProfile.findOne({ sid: req.user.steamid });
    if (!SiteUser) {
      // If there are no settings stored for this guild, we create them and try to retrive them again.
      const newUser = new UserProfile({
        sid: req.user.steamid,
        nickname: req.user.username
      });
      await newUser.save().catch(()=>{});
      SiteUser = await UserProfile.findOne({ sid: req.user.steamid });

      let logschannel = client.guilds.cache.get("828296539582496799").channels.cache.get("836877209288441927");
  
      let emb1 = new Discord.MessageEmbed()
          .setColor('#2980b9')
          .setTitle('Новый пользователь')
          .setDescription(`${req.user.username} (${req.user.steamid})\nhttps://gmodshop.ru/u/${req.user.steamid}`)
      logschannel.send(emb1)

      var download = function(uri, filename, callback){
        request.head(uri, function(err, res, body){
          request(uri).pipe(fs.createWriteStream(`../../../var/www/html/avatars/` + filename)).on('close', callback);
        });
      };
      //large
      download(req.user.avatar.large, `${req.user.steamid}.png`, function(){
        console.log('done');
      });

      if (req.session.backURL) {
      	res.redirect(req.session.backURL);
      	req.session.backURL = req.session.backURL;
      } else {
      	res.redirect('/');
      }

    } else if (req.session.backURL) {
    	res.redirect(req.session.backURL);
    } else {
    	res.redirect('/')
    }

});

app.get('/logout', steam.enforceLogin('/'), function(req, res) {
    req.logout();
    res.redirect('/');
});

app.post('/api/avatar/sync', checkAuth, async (req,res) => {

	steamapi.getUserSummary(req.user.steamid).then(summary => {
		console.log(summary.avatar.large)
  		var download = function(uri, filename, callback){
  		request.head(uri, function(err, res, body){
  		    request(uri).pipe(fs.createWriteStream(`../../../var/www/html/avatars/` + filename)).on('close', callback);
  		  });
  		};
  		download(summary.avatar.large, `${req.user.steamid}.png`, function(){
  		  console.log('sync');
  		});
	})
	.catch((error) =>
    {
      console.log('/api/avatar/sync error ', error)
    });

})
// app.get('/api/avatar/:id', async (req,res) => {
// 	if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
// 	steamapi.getUserSummary(req.params["id"]).then(summary => {
// 		console.log(summary.avatar.large)
// 		res.send(summary.avatar.large)
// 	})
// 	.catch((error) =>
//     {
//       console.log('/api/avatar error ', error)
//     });

// })

app.get('/', async (req, res) => {
    

    var aplist = await ProductProifle.find({allow: "accept"}).sort({_id:-1}).limit(9)
    var aplist2 = await ProductProifle.find({allow: "accept"}).sort({positive: -1, purchases: -1}).limit(9)



    var me = null
    if (req.user) {
    	var me = await UserProfile.findOne({ sid: req.user.steamid });
    }
    renderTemplate(res,req, "home.ejs", {ap: aplist, ap2: aplist2, auth: me})
});

app.get('/tos', async (req, res) => {
    
    renderTemplate(res,req, "tos.ejs")
});

app.get('/testhome', async (req, res) => {
    

    var aplist = await ProductProifle.find({allow: "accept"}).sort({_id:-1}).limit(9)
    var aplist2 = await ProductProifle.find({allow: "accept"}).sort({positive: -1}).limit(9)



    var me = null
    if (req.user) {
    	var me = await UserProfile.findOne({ sid: req.user.steamid });
    }
    renderTemplate(res,req, "home2.ejs", {ap: aplist, ap2: aplist2, auth: me})
});

app.get('/about', (req, res) => {
	renderTemplate(res, req, "about.ejs");
})

app.get('/partners', (req, res) => {
	renderTemplate(res, req, "partners.ejs");
})

app.get('/become-a-seller', (req,res) => {

  renderTemplate(res, req, "seller.ejs");

})

app.get('/safe-code', (req,res) => {

  renderTemplate(res, req, "safecode.ejs");

})

app.get('/dashboard', checkAuth, (req, res) => {

    renderTemplate(res, req, "dashboard.ejs");
	

})

app.get('/search', async (req, res) => {
  var aplistcount = await ProductProifle.countDocuments()

  var slavamarlow = await ProductProifle.find(
  {
    allow: "accept",
  })
  var aplist = await ProductProifle.find({allow: "accept"}).sort({_id:-1}).limit(9)
  const limit = 24
  var searchfield = []

  await searchfield.push(req.query.query)

  searchfield = await searchfield.join()


  const searchcat = req.query.category
  const searchgam = req.query.gamemode

  if (Array.isArray(searchgam)) return res.send('Вы привысили число запросов')
  if (Array.isArray(searchcat)) return res.send('Вы привысили число запросов')

  const page = req.query.page == null ? 1 : req.query.page
  if (req.query.page > 100) return res.send('Вы привысили число запросов')
  const pagecount = Math.ceil(slavamarlow.length / limit)



  if ( (page-1)*limit < 0) return res.send('Вы привысили число запросов')
  var aplist = await ProductProifle.find({allow: "accept"}).limit(limit *1).skip((page-1)*limit).sort({_id:-1})
  if (!req.query) {
    var aplist = await ProductProifle.find({allow: "accept"}).limit(limit *1).skip((page-1)*limit)
  } else if (req.query.query && req.query.category != 'all' && req.query.gamemode != 'all') {
    var aplist = await ProductProifle.find(
    {
      allow: "accept",
      name:{$regex: searchfield,$options: '$i'},
      category: searchcat,
      gamemodes: searchgam
    })
  } else if (req.query.query && req.query.category == 'all' && req.query.gamemode != 'all') {
    var aplist = await ProductProifle.find(
    {
      allow: "accept",
      name:{$regex: searchfield,$options: '$i'},
      gamemodes: searchgam
    })
  } else if (req.query.query && req.query.category == 'all' && req.query.gamemode == 'all') {
    var aplist = await ProductProifle.find(
    {
      allow: "accept",
      name:{$regex: searchfield,$options: '$i'},
    })
  } else if (req.query.query && req.query.category != 'all' && req.query.gamemode == 'all') {
    var aplist = await ProductProifle.find(
    {
      allow: "accept",
      name:{$regex: searchfield,$options: '$i'},
      category: searchcat
    })
  } else if (!req.query.query && req.query.category != 'all' && req.query.gamemode == 'all') {
    var aplist = await ProductProifle.find(
    {
      allow: "accept",
      category: searchcat
    })
  } else if (req.query.page && !req.query.query && req.query.category != 'all' && req.query.gamemode != 'all') {
    var aplist = await ProductProifle.find(
    {
      allow: "accept",
      gamemodes: searchgam,
      category: searchcat
    })
  } else if (!req.query.query && req.query.category == 'all' && req.query.gamemode != 'all') {
    var aplist = await ProductProifle.find(
    {
      allow: "accept",
      gamemodes: searchgam
    })
  }
  renderTemplate(res, req, "search.ejs", {addons: aplist, count: slavamarlow.length, pages: pagecount, activepage: page});
})

// db.bios.find( { "name.last": "Hopper" } )

app.get('/support', checkAuth, async (req, res) => {

  let ticket = await SupportHelp.find().sort({_id:-1})

	renderTemplate(res, req, "supports/support.ejs", {tickets: ticket});
});

app.get('/support/create', checkAuth, (req, res) => {
	renderTemplate(res, req, "supports/supportcreate.ejs");
});

app.post('/support/create', checkAuth, async (req,res) => {
  let cid = await SupportHelp.countDocuments()
  var UserEbaniy = await UserProfile.findOne({ sid: req.user.steamid });
  if (UserEbaniy.sid == '76561198835814674') {
    renderTemplate(res, req, "error.ejs", {error: `Модерация сайта запретила вам отправять тикеты в поддержку`});
    return
  }
  let timeout = 1200000;
  if (UserEbaniy.cooldowns !== null && timeout - (Date.now() - UserEbaniy.cooldowns) > 0) {
    let time = (timeout - (Date.now() - UserEbaniy.cooldowns));
    // renderTemplate(res, req, "error.ejs", {error: `Написать тикет можно будет через ${time.hours}ч ${time.minutes}м ${time.seconds}с`});
    renderTemplate(res, req, "error.ejs", {error: `Подождите некоторое время`});
    return
  }

  if (req.body.subject.length < 1) return renderTemplate(res, req, "error.ejs", {error: 'Символов должно быть больше 1'});
  if (req.body.subject.length > 500) return renderTemplate(res, req, "error.ejs", {error: 'Символов должно быть меньше 500'});
  var Sup = await SupportHelp.findOne({ id: cid });
  if (!Sup) {
    const NewTicket = new SupportHelp({
      id: cid,
      owner: req.user.steamid,
      to: req.body.ptype,
      type: req.body.type,
      title: req.body.subject,
      date: Date.now(),
      subject: req.body.message,
    });
  await NewTicket.save().catch(()=>{});

  let tickettype = "Другое"

  if (req.body.type == 1) {
    tickettype = await "Жалоба на аддон"
  } else if (req.body.type == 2) {
    tickettype = await "Поддержка"
  } else if (req.body.type == 3) {
    tickettype = await "Веб-сайт"
  } else if (req.body.type == 4) {
    tickettype = await "Вывод"
  } else {
    tickettype = await "Другое"
  }

  let logschannel = client.guilds.cache.get("828296539582496799").channels.cache.get("836990976735838248");

  let emb1 = new Discord.MessageEmbed()
      .setColor('#2980b9')
      .setTitle('Новое обращение в службу поддержки')
      .setDescription(`Тип обращения: ${tickettype}\nНазвание: ${req.body.subject}\nПользователь: ${req.user.username}\n\nОтвет: https://gmodshop.ru/admin/tickets/view/${cid}`)
  logschannel.send("<@&828296652682166364> <@&828296701252862022>") 
  logschannel.send(emb1) 


    UserEbaniy.cooldowns = Date.now();
    UserEbaniy.save();

  }
  updatediscordsupport()
  res.redirect('/support')

})

app.post('/api/support/close', checkAuth, async (req, res) => {
  let ids = req.query.id
  var Sup = await SupportHelp.findOne({ id: ids });
  if (!Sup) return renderTemplate(res, req, "error.ejs", {error: 'Произошла ошибка сообщите администрации сайта'});
  if (Sup.status == 'closed') return
  if (Sup.owner != req.user.steamid) return

  Sup.status = 'closed'
  Sup.save()

  res.redirect('/support')

  updatediscordsupport()

})

app.post('/api/admin/close', checkAuth, async (req, res) => {
  let ids = req.query.id
  var Sup = await SupportHelp.findOne({ id: ids });
  if (!Sup) return renderTemplate(res, req, "error.ejs", {error: 'Произошла ошибка сообщите администрации сайта'});
  var Admin = await UserProfile.findOne({ sid: req.user.steamid })
  if (!Admin) return renderTemplate(res, req, "error.ejs", {error: 'Профиль администратора не загружен'});
  if (Admin.rank == 'rank rank-member') return renderTemplate(res, req, "error.ejs", {error: 'Вы не администратор сайта'});
  if (Sup.status == 'closed') return

  Sup.status = 'closed'
  Sup.save()

  var UserEbaniy = await UserProfile.findOne({ sid: Sup.owner });

  const notifysend = {
      title: `Тикет #${Sup.id} был закрыт`,
      message: `Следующий запрос в службу поддержки был помечен как закрытый/решенный.`,
      link: `https://gmodshop.ru/support/view/${Sup.id}`,
      date: Date.now()
  }
  
  UserEbaniy.notify.push(notifysend);
  UserEbaniy.isnotify = true
  UserEbaniy.save()

  if (UserEbaniy.discordid) {
  
    let tosender = new Discord.MessageEmbed()
    .setTitle(`Тикет #${Sup.id} был закрыт`)
    .setDescription(`Следующий запрос в службу поддержки был помечен как закрытый/решенный.\nhttps://gmodshop.ru/support/view/${Sup.id}`)
    .setColor("#2980b9")
    .setTimestamp()
    client.users.cache.get(UserEbaniy.discordid).send(tosender);
  
  }

  updatediscordsupport()

  res.redirect('/support')

  updatediscordsupport()

})

app.post('/api/admin/accept', checkAuth, async (req, res) => {
  let ids = req.query.id
  var Sup = await ProductProifle.findOne({ id: ids });
  var Admin = await UserProfile.findOne({ sid: req.user.steamid })
  if (!Admin) return renderTemplate(res, req, "error.ejs", {error: 'Профиль администратора не загружен'});
  if (!Sup) return renderTemplate(res, req, "error.ejs", {error: 'Произошла ошибка сообщите администрации сайта'});
  if (Admin.rank == 'rank rank-member') return renderTemplate(res, req, "error.ejs", {error: 'Вы не администратор сайта'});

  Sup.allow = 'accept'
  Sup.save()

  var UserEbaniy = await UserProfile.findOne({ sid: Sup.seller });

  const notifysend = {
      title: `Ваша загрузка была одобрена`,
      message: `Ваша загрузка была одобрена администрацией сайта. Мы очень рады, что вы сделали вклад в наше сообщество`,
      link: `https://gmodshop.ru/addon/${Sup.id}`,
      date: Date.now()
  }
  
  UserEbaniy.notify.push(notifysend);
  UserEbaniy.isnotify = true
  UserEbaniy.save()

  if (UserEbaniy.discordid) {
  
    let tosender = new Discord.MessageEmbed()
    .setTitle(`Ваша загрузка была одобрена`)
    .setDescription(`Ваша загрузка была одобрена администрацией сайта. Мы очень рады, что вы сделали вклад в наше сообщество\nhttps://gmodshop.ru/addon/${Sup.id}`)
    .setColor("#2980b9")
    .setTimestamp()
    client.users.cache.get(UserEbaniy.discordid).send(tosender);
  
  }

  let logschannel = client.guilds.cache.get("828296539582496799").channels.cache.get("836877209288441927");
  
  let emb1 = new Discord.MessageEmbed()
      .setColor('#2980b9')
      .setTitle('Новая загрузка была одобрена')
      .setDescription(`**${Sup.name}**\nhttps://gmodshop.ru/addon/${Sup.id}`)
  logschannel.send(emb1)  

  res.redirect('/admin/products')

})

app.post('/api/admin/deny', checkAuth, async (req, res) => {
  let ids = req.query.id
  var Sup = await ProductProifle.findOne({ id: ids });
  var Admin = await UserProfile.findOne({ sid: req.user.steamid })
  if (!Admin) return renderTemplate(res, req, "error.ejs", {error: 'Профиль администратора не загружен'});
  if (!Sup) return renderTemplate(res, req, "error.ejs", {error: 'Произошла ошибка сообщите администрации сайта'});
  if (Admin.rank == 'rank rank-member') return renderTemplate(res, req, "error.ejs", {error: 'Вы не администратор сайта'});

  Sup.allow = 'deny'
  Sup.save()

  var UserEbaniy = await UserProfile.findOne({ sid: Sup.seller });

  const notifysend = {
      title: `Ваша загрузка была отклонена`,
      message: `Ваша загрузка была отклонена. Если вы хотите узнать, почему мы не смогли одобрить вашу загрузку, пожалуйста, свяжитесь с нами или посетите наши рекомендации по загрузке по ссылке ниже. Мы более чем рады, что вы внесете необходимые изменения, чтобы получить одобрение вашего дополнения/загрузки.`,
      link: `https://gmodshop.ru/become-a-seller`,
      date: Date.now()
  }
  
  UserEbaniy.notify.push(notifysend);
  UserEbaniy.isnotify = true
  UserEbaniy.save()

  if (UserEbaniy.discordid) {
  
    let tosender = new Discord.MessageEmbed()
    .setTitle(`Ваша загрузка была отклонена`)
    .setDescription(`Ваша загрузка была отклонена. Если вы хотите узнать, почему мы не смогли одобрить вашу загрузку, пожалуйста, свяжитесь с нами или посетите наши рекомендации по загрузке по ссылке ниже. Мы более чем рады, что вы внесете необходимые изменения, чтобы получить одобрение вашего дополнения/загрузки.\nhttps://gmodshop.ru/become-a-seller`)
    .setColor("#2980b9")
    .setTimestamp()
    client.users.cache.get(UserEbaniy.discordid).send(tosender);
  
  }

  res.redirect('/admin/products')

})

app.post('/api/support/reply', checkAuth, async (req, res) => {
  let ids = req.query.id
  var Sup = await SupportHelp.findOne({ id: ids });
  
  if (req.body.message.length < 1) return res.send('Символов должно быть больше 1')
  if (req.body.message.length > 500) return res.send('Символов должно быть меньше 500')
  if (!Sup) return res.send('Произошла ошибка сообщите администрации сайта');
  if (Sup.status == 'closed') return

  const msghelp = {
    name: req.user.username,
    sid: req.user.steamid,
    msg: req.body.message,
    date: Date.now()
  }
  
  Sup.messages.push(msghelp);
  Sup.status = 'response'
  Sup.save()

  updatediscordsupport()

  res.redirect(`/support`)

})

app.get("/support/view/:id", checkAuth, async (req, res) => {

  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});

  var Ticket = await SupportHelp.findOne({ id: req.params["id"] });
  var UserEbaniy = await UserProfile.findOne({ sid: req.user.steamid });
  if (!UserEbaniy) return res.send('Пользователь не найден!')
  if (UserEbaniy.sid != Ticket.owner) return renderTemplate(res, req, "error.ejs", {error: 'Ошибка доступа'});

  renderTemplate(res, req, "supports/view.ejs", {TicketInfo: Ticket});


})

app.get('/upload', checkAuth, (req, res) => {

    renderTemplate(res, req, "upload.ejs");
  
});

app.post('/upload', checkAuth, async function (req, res) {
  var UserEbaniy = await UserProfile.findOne({ sid: req.user.steamid })
  var ProductT = await ProductProifle.findOne({ name: req.body.name });
  var idc = await ProductProifle.countDocuments()
  let timeout = 300000;
  if (UserEbaniy.cooldowns !== null && timeout - (Date.now() - UserEbaniy.cooldowns) > 0) {
    let time = (timeout - (Date.now() - UserEbaniy.cooldowns));
    // renderTemplate(res, req, "error.ejs", {error: `Опубликовать аддон можно будет через ${time.hours}ч ${time.minutes}м ${time.seconds}с`});
    renderTemplate(res, req, "error.ejs", {error: `Подождите некоторое время`});
    return
  }


  var dir = "../../../var/www/html/uploads/" + idc;

  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  var diraddon = __dirname + '/uploads/' + idc;

  if (!fs.existsSync(diraddon)){
      fs.mkdirSync(diraddon);
  }

  var dir2 = "../../../var/www/html/uploads/" + idc + '/imgs';

  if (!fs.existsSync(dir2)){
      fs.mkdirSync(dir2);
  }

  var dir3 = __dirname + '/uploads/' + idc + '/addon';

  if (!fs.existsSync(dir3)){
      fs.mkdirSync(dir3);
  }

  var download = function(uri, filename, callback){
      request.head(uri, function(err, res, body){
        request(uri).pipe(fs.createWriteStream(`../../../var/www/html/uploads/${idc}/imgs/` + filename)).on('close', callback);
      });
    };
    download("https://i.ytimg.com/vi/WeUKh9GHpt4/maxresdefault.jpg", `1.png`, function(){
      console.log('imgs send');
    });

  if (!ProductT) {
    if (req.body.name == '') return
    const newtovar = new ProductProifle({
      id: idc,
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      gamemodes: req.body.gamemodes,
      tags: req.body.tags,
      seller: req.user.steamid,
      date: Date.now(),
    });
    await newtovar.save().catch(()=>{});
    ProductT = await ProductProifle.findOne({ name: req.body.name });

    let logschannel = client.guilds.cache.get("828296539582496799").channels.cache.get("836994069921661000");
    
    let emb1 = new Discord.MessageEmbed()
        .setColor('#2980b9')
        .setTitle('Новая загрузка')
        .setDescription(`Название: ${req.body.name}\nПользователь: ${req.user.username}\n\nСсылка: https://gmodshop.ru/addon/${idc}`)
    logschannel.send("<@&828296652682166364> <@&828296701252862022>") 
    logschannel.send(emb1) 

  }
  UserEbaniy.cooldowns = Date.now();
  UserEbaniy.save()
  res.redirect(`/edit/${idc}`)
})

app.get("/dashboard/items", checkAuth, async(req,res) => {

  var aplist = await ProductProifle.find( { seller: req.user.steamid } )

  renderTemplate(res, req, "dashboarditems.ejs", {addons: aplist});

})

app.get("/u/:id", async (req, res) => {

  var SiteUser = await UserProfile.findOne({ sid: req.params["id"] });
  if (!SiteUser) return renderTemplate(res, req, "user.ejs", {usersite: null, addons: null});

  var aplist = await ProductProifle.find( { seller: SiteUser.sid } )

  renderTemplate(res, req, "user.ejs", {usersite: SiteUser, addons: aplist});
});

app.get("/edit/:id", checkAuth, async (req, res) => {

  if (req.user == null) return res.redirect('/authenticate')
  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  var ProductAddon = await ProductProifle.findOne({ id: req.params["id"] });
  if (!ProductAddon) return renderTemplate(res, req, "edit.ejs", {product: null, imgaddon: null});
  if (ProductAddon.seller != req.user.steamid) return renderTemplate(res, req, "edit.ejs", {product: null, imgaddon: null});

  const testFolder = '../../../var/www/html/uploads/' + ProductAddon.id + '/imgs/'
  var pimg = [];
  fs.readdir(testFolder, async (err, files) => {
    files.forEach(async file => {
      pimg.push(file)
    });
    renderTemplate(res, req, "edit.ejs", {product: ProductAddon, imgaddon: pimg});
  });

});

function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
function clearimg(ids) {

  var fol = "../../../var/www/html/uploads/" + ids + '/imgs'

  fs.readdir(fol, async (err, files) => {
    if (err) throw err;
          
    for (const file of files) {
      fs.unlink(path.join(fol, file), err => {
        if (err) throw err;
      });
    }
  });
}

app.post("/edit/:id", checkAuth, async (req,res) => {
  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  var ProductAddon = await ProductProifle.findOne({ id: req.params["id"] });
  if (!ProductAddon) return renderTemplate(res, req, "error.ejs", {error: 'Аддона не существует'});
  if (ProductAddon.seller != req.user.steamid) return renderTemplate(res, req, "error.ejs", {error: 'Вы не владелец аддона'});

  var dir = "../../../var/www/html/uploads/" + ProductAddon.id;

  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }


  var dir2 = "../../../var/www/html/uploads/" + ProductAddon.id + '/imgs';
  

  if (!fs.existsSync(dir2)){
      fs.mkdirSync(dir2);
  }

  var dir3 = __dirname + '/uploads/' + ProductAddon.id + '/addon';

  if (!fs.existsSync(dir3)){
      fs.mkdirSync(dir3);
  }

  var formData = new formidable.IncomingForm();

  let deletefile = false
  formData.on('fileBegin', async function (name, file){
    //console.log(file)
  	if (file.type == 'application/x-zip-compressed') {
  		file.path = __dirname + '/uploads/' + ProductAddon.id + '/addon/' + 'addon.zip';
  	} else if (file.type == 'image/jpeg') {
      if (!deletefile) {
        clearimg(ProductAddon.id)
        deletefile = true
      }

  		file.path = "../../../var/www/html/uploads/" + ProductAddon.id + '/imgs/' + makeid(6) + '.jpg';
  	} else if (file.type == 'image/png') {
      if (!deletefile) {
        clearimg(ProductAddon.id)
        deletefile = true
      }
      file.path = "../../../var/www/html/uploads/" + ProductAddon.id + '/imgs/' + makeid(6) + '.png';
    }
  });

  formData.on('file', function (name, file){
      //console.log('zagruzka',name);
  });


  const testFolder = "../../../var/www/html/uploads/" + ProductAddon.id + '/imgs/'
  var pimg = [];
  fs.readdir(await testFolder, async (err, files) => {
    files.forEach(async file => {
      await pimg.push(file)
    });
    let check = await pimg
    console.log('check file - ', check)
    // ProductAddon.img = await `https://cdn.gmodshop.ru/uploads/${ProductAddon.id}/imgs/${imgarray[0]}`
    // ProductAddon.image_order = fields.image_order
    // ProductAddon.save()
  });

  formData.parse(req, async (err, fields, files) => {
    let io = await fields.image_order
    if (deletefile) {
      var testimg = [];
      fs.readdir(await testFolder, async (err, files) => {
      files.forEach(async file => {
        await testimg.push(file)
      });
      ProductAddon.img = await `https://cdn.gmodshop.ru/uploads/${ProductAddon.id}/imgs/${testimg[0]}`
      ProductAddon.image_order = testimg.toString()
      ProductAddon.name = fields.title
      ProductAddon.description = fields.description
      ProductAddon.tags = fields.tags
      ProductAddon.gamemodes = fields.gamemodes
      ProductAddon.category = fields.category
      ProductAddon.price = fields.price
      ProductAddon.save()
      });
    } else {
      console.log('НЕ ПУСТО')


      if (fields.image_order.length > 5) {
        ProductAddon.image_order = fields.image_order
        var imgarray = await fields.image_order.split(",").map(String);
        ProductAddon.img = await `https://cdn.gmodshop.ru/uploads/${ProductAddon.id}/imgs/${imgarray[0]}`
      }
      ProductAddon.name = fields.title
      ProductAddon.description = fields.description
      ProductAddon.tags = fields.tags
      ProductAddon.gamemodes = fields.gamemodes
      ProductAddon.category = fields.category
      ProductAddon.price = fields.price
      ProductAddon.save()
    }
  });

})

app.post("/api/publish/:id", async (req,res) => {
  var formData = new formidable.IncomingForm();
  formData.on('fileBegin', async function (name, file){
    console.log(file)
  });

})

app.get("/addon/:id", async (req, res) => {

  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Аддон не найден!'});

  var ProductAddon = await ProductProifle.findOne({ id: req.params["id"] });
  if (!ProductAddon) return renderTemplate(res, req, "error.ejs", {error: 'Аддон не найден!'});
  if (ProductAddon.allow == 'wait') {
    if (!req.user) return renderTemplate(res, req, "error.ejs", {error: 'Аддон находится под модерацией'});
    var AdminEbaniy = await UserProfile.findOne({ sid: req.user.steamid });
    if (ProductAddon.seller != req.user.steamid && AdminEbaniy.rank == 'rank rank-member') return renderTemplate(res, req, "error.ejs", {error: 'Аддон находится под модерацией'});
  } else if (ProductAddon.allow == 'deny') {
    if (!req.user) return renderTemplate(res, req, "error.ejs", {error: 'Аддон был заблокирован на GmodShop'});
    var AdminEbaniy = await UserProfile.findOne({ sid: req.user.steamid });
    if (ProductAddon.seller != req.user.steamid && AdminEbaniy.rank == 'rank rank-member') return renderTemplate(res, req, "error.ejs", {error: 'Аддон был заблокирован на GmodShop'}); 
  }
  var SellerUser = await UserProfile.findOne({ sid: ProductAddon.seller });
  var alluser = await UserProfile.find()
  if (!SellerUser) return renderTemplate(res, req, "addon.ejs", {product: null});
  var datatimes = ProductAddon.date / 1000

  var purchases

  if (req.user == null) {
  	var purchases = null
  } else {
  	var me = await UserProfile.findOne({ sid: req.user.steamid });
  	var purchases = await me.purchases
  }

  var randomproduct = await ProductProifle.aggregate([{ $match: { allow: "accept" } },{ $sample: { size: 3 } }])

  const testFolder = "../../../var/www/html/uploads/" + ProductAddon.id + '/imgs/'
  var pimg = [];
  fs.readdir(testFolder, async (err, files) => {
    files.forEach(async file => {
      pimg.push(file)
    });
    renderTemplate(res, req, "addon.ejs", {product: ProductAddon, imgaddon: pimg, datatime: datatimes, seller: SellerUser, purchases: purchases, all: alluser, random: randomproduct});
  });
});

app.get("/dashboard/downloads", checkAuth, async (req,res) => {

  	var aplist = await ProductProifle.find()
  	var me = await UserProfile.findOne({ sid: req.user.steamid });
  	var purchases = await me.purchases

  	renderTemplate(res, req, "dashboarduploads.ejs", {addons: aplist, purchases: purchases});

})

app.get("/dashboard/payments", checkAuth, async (req,res) => {

	var me = await UserProfile.findOne({ sid: req.user.steamid });
  	var pay = await WithdrawProifle.find({ owner: req.user.steamid })
	renderTemplate(res, req, "dashboardpayments.ejs", {profile: me, payments: pay});

})

app.get('/notifications', checkAuth, async (req, res) => {

	var me = await UserProfile.findOne({ sid: req.user.steamid });

	if (me.isnotify) {
		me.isnotify = false
		me.save()
	}

	renderTemplate(res, req, "dashboard/notify.ejs", {profile: me});

})

app.get('/dashboard/settings', checkAuth, async (req, res) => {

  var me = await UserProfile.findOne({ sid: req.user.steamid });

  if (!me) return res.send('Профиль не найден')

  renderTemplate(res, req, "dashboard/settings.ejs", {profile: me});

})

app.get('/dashboard/oauth', checkAuth, async (req, res) => {

  if (req.query.code) {

    var siteuser = await UserProfile.findOne({ sid: req.user.steamid });

    if (!siteuser) return res.send('Ошибка доступа')




  oauth.tokenRequest({
        clientId: "836876088868995082",
        clientSecret: "4CRQSfx-XU0JNz9Yz5eJRhZi-c0YMp8n",
     
        code: req.query.code,
        scope: "identify guilds.join",
        grantType: "authorization_code",
        
        redirectUri: "https://gmodshop.ru/dashboard/oauth",
    }).then((data) =>
    {

      oauth.getUser(data.access_token).then(async (userdata) =>
      {

        oauth.addMember({
           accessToken: data.access_token,
           botToken: "ODM2ODc2MDg4ODY4OTk1MDgy.YIkXlw.N9pLc_C-LQk389syMw9C8AmA55I",
           guildId: "828296539582496799",
           userId: userdata.id,
           roles: ["837692622834237481"]
        }).then( (member) =>
        {
          console.log('member joined')
        })
        .catch((err3) =>
        {
          console.log('ERROR #3')
        })

        siteuser.discordid = userdata.id
        siteuser.save()

        var SiteUser = await DiscordProfile.findOne({ id: userdata.id });
        if (!SiteUser) {
          const newUser = new DiscordProfile({
            id: userdata.id,
            siteid: req.user.steamid
          });
          await newUser.save().catch(()=>{});
        }

        let main = client.guilds.cache.get("828296539582496799");
    
        let secondmember = await main.members.cache.find(m => m.id === userdata.id)
        if (secondmember) {
          secondmember.roles.add('837692622834237481')
        }

        renderTemplate(res, req, "dashboard/oauth.ejs", {discord: userdata.username});
      })
      .catch((err2) =>
      {
        console.log('ERROR #2')
      })

    })
    .catch((err) =>
    {
      console.log('ERROR')
    })
  } else {
    renderTemplate(res, req, "dashboard/oauth.ejs", {discord: undefined});
  }

})

app.post('/dashboard/settings', checkAuth, async (req, res) => {

  var me = await UserProfile.findOne({ sid: req.user.steamid });

  if (!me) return res.send('Профиль не найден')

  if (req.body.description.length > 500) return res.send('Нельзя больше 500 символов')

  me.desc = req.body.description
  me.save()

  res.redirect('/dashboard/settings')
})

app.get('/admin', checkAuth, async (req, res) => {

  let ticketcount = await SupportHelp.find({ status: 'response' });
  renderTemplate(res, req, "admin/dash.ejs", {TCount: ticketcount.length});

})

app.get('/admin/tickets', checkAuth, async (req, res) => {

  let ticket = await SupportHelp.find()
  let ticketcount = await SupportHelp.find({ status: 'response' });
  renderTemplate(res, req, "admin/tickets.ejs", {Tickets: ticket, TCount: ticketcount.length});

})

app.get('/admin/products', checkAuth, async (req, res) => {

  let products = await ProductProifle.find()
  let ticketcount = await SupportHelp.find({ status: 'response' });
  renderTemplate(res, req, "admin/addon.ejs", {Product: products, TCount: ticketcount.length});

})


app.get("/admin/tickets/view/:id", checkAuth, async (req, res) => {

  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  let ticketcount = await SupportHelp.find({ status: 'response' });
  var Ticket = await SupportHelp.findOne({ id: req.params["id"] });

  renderTemplate(res, req, "admin/tickets_view.ejs", {TicketInfo: Ticket, TCount: ticketcount.length});


})

app.post('/admin/tickets/view/:id', checkAuth, async (req, res) => {

  let ids = req.body.id
  var Sup = await SupportHelp.findOne({ id: ids });
  var Admin = await UserProfile.findOne({ sid: req.user.steamid })
  if (!Admin) return res.send('Авторизируйся на сайте')
  if (req.body.review_text.length < 2) return renderTemplate(res, req, "error.ejs", {error: 'Символов должно быть больше 2'});
  if (req.body.review_text.length > 500) return renderTemplate(res, req, "error.ejs", {error: 'Символов должно быть меньше 500'});
  if (!Sup) return renderTemplate(res, req, "error.ejs", {error: 'Произошла ошибка сообщите администрации сайта'});
  if (Sup.status == 'closed') return renderTemplate(res, req, "error.ejs", {error: 'Пользователь закрыл тикет'});
  if (Admin.rank == 'rank rank-member') return res.send('Ты как это сделал? Ты не администрулькин')

  const msghelp = {
    name: req.user.username,
    sid: req.user.steamid,
    msg: req.body.review_text,
    date: Date.now()
  }
  
  Sup.messages.push(msghelp);
  Sup.status = 'wait'
  Sup.save()

  var UserEbaniy = await UserProfile.findOne({ sid: Sup.owner });

  const notifysend = {
      title: `Ответ на ${Sup.title}`,
      message: `На ваш запрос в службу поддержки был выдан ответ`,
      link: `https://gmodshop.ru/support/view/${ids}`,
      date: Date.now()
  }
  
  UserEbaniy.notify.push(notifysend);
  UserEbaniy.isnotify = true
  UserEbaniy.save()

  if (UserEbaniy.discordid) {

    let tosender = new Discord.MessageEmbed()
    .setTitle(`Ответ на ${Sup.title}`)
    .setDescription(`На ваш запрос в службу поддержки был выдан ответ\nhttps://gmodshop.ru/support/view/${ids}`)
    .setColor("#2980b9")
    .setTimestamp()
    client.users.cache.get(UserEbaniy.discordid).send(tosender);

  }

  updatediscordsupport()

  res.redirect(`/admin/tickets/view/${ids}`)

})

app.post("/dashboard/payments", checkAuth, async(req,res) => {

	var me = await UserProfile.findOne({ sid: req.user.steamid });
	if (!req.body.ptype) return renderTemplate(res, req, "error.ejs", {error: 'Не выбрана система'});
	if (!req.body.requisite) return renderTemplate(res, req, "error.ejs", {error: 'Не указаны реквизиты'});
	if (!req.body.summa) return renderTemplate(res, req, "error.ejs", {error: 'Не указана сумма'});

  if (req.body.summa < 150) return renderTemplate(res, req, "error.ejs", {error: 'Минимальный вывод - 150 РУБ'});

	if (me.rub < req.body.summa) return renderTemplate(res, req, "error.ejs", {error: 'У вас нету столько денег на балансе'});

  let cid = await WithdrawProifle.count()

  var WithdrawScheme = await WithdrawProifle.findOne({ id: cid });
  if (!WithdrawScheme) {
    const newUser = new WithdrawProifle({
      id: cid,
      type: req.body.ptype,
      rek: req.body.requisite,
      rub: req.body.summa,
      status: "wait",
      owner: me.sid
    });
  await newUser.save().catch(()=>{});
  }

  me.rub = me.rub - req.body.summa
  me.save()

  res.redirect('/dashboard/payments')



})



app.post("/buy/:id", checkAuth, async (req, res) => {
  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  var ProductAddon = await ProductProifle.findOne({ id: req.params["id"] });
  if (!ProductAddon) return renderTemplate(res, req, "error.ejs", {error: 'Такого аддона не существует'});
  var SellerAddon = await UserProfile.findOne({ sid: ProductAddon.seller });
  if (!SellerAddon) return renderTemplate(res, req, "error.ejs", {error: 'Сообщите администрации об этой ошибке'});
  var buyer = await UserProfile.findOne({ sid: req.user.steamid });
  if (req.user.steamid == ProductAddon.seller) return renderTemplate(res, req, "error.ejs", {error: 'Нельзя купить свой же аддон'});

  let homie = false
  
  for await (var value of buyer.purchases.values()) {
  	if (value == ProductAddon.id) {
  		renderTemplate(res, req, "error.ejs", {error: 'У вас уже куплен данный аддон'});
  		homie = true
  		return
  	}
  }

  if (homie) return renderTemplate(res, req, "error.ejs", {error: 'У вас уже куплен данный аддон'});

  if (buyer.rub < ProductAddon.price) return renderTemplate(res, req, "errorpayment.ejs");

  if (!homie) {

  	const notifysend = {
  	    title: `Покупка аддона ${ProductAddon.name}`,
  	    message: `Ваш аддон был успешно приобретен пользователем ${buyer.nickname}. На ваш баланс зачислено ${ProductAddon.price} ₽`,
  	    link: ``,
  	    date: Date.now()
  	}
	
  	SellerAddon.notify.push(notifysend);
  	SellerAddon.isnotify = true

    if (SellerAddon.discordid) {
  
      let tosender = new Discord.MessageEmbed()
      .setTitle(`Покупка аддона ${ProductAddon.name}`)
      .setDescription(`Ваш аддон был успешно приобретен пользователем ${buyer.nickname}. На ваш баланс зачислено ${ProductAddon.price} ₽`)
      .setColor("#2980b9")
      .setTimestamp()
      client.users.cache.get(SellerAddon.discordid).send(tosender);
  
    }

    buyer.purchases.push(ProductAddon.id)
    buyer.rub = buyer.rub - ProductAddon.price
    SellerAddon.rub = SellerAddon.rub + ProductAddon.price
    ProductAddon.purchases = ProductAddon.purchases + 1
  	buyer.save();
    ProductAddon.save()
    SellerAddon.save()

    res.redirect(`/addon/${ProductAddon.id}`)

  }
})

app.post("/donateqiwitrypay", checkAuth, async (req, res) => {

  if (!req.body.pay_option) return renderTemplate(res, req, "error.ejs", {error: 'Не выбрана платежная система'});
  if (!req.body.summa) return renderTemplate(res, req, "error.ejs", {error: 'Не выбрана сумма платежа'});
  if (req.body.pay_option == 'qiwi') {

    const bid = qiwiApi.generateId();
    const lifetime = qiwiApi.getLifetimeByDay(1);
    const fields = {
        amount: req.body.summa,
        currency: 'RUB',
        comment: `Пополнение ${req.body.summa} Р. для ${req.user.steamid} на сайте https://gmodshop.ru/`,
        expirationDateTime: lifetime,
        email: 'realprojectoff@gmail.com',
        account : req.user.steamid,
        successUrl: 'https://gmodshop.ru/getpay'
    };
    
    qiwiApi.createBill( bid, fields ).then( data => {
      res.redirect(data.payUrl)
    });

  } else if (req.body.pay_option == 'unitpay') {

    let price = req.body.summa;
    let orderId = qiwiApi.generateId();
    let description = req.user.steamid;

    res.redirect(u.form(price, orderId, description))

  }



})

app.get("/buy/:id", checkAuth, async (req, res) => {
	if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  	var ProductAddon = await ProductProifle.findOne({ id: req.params["id"] });
  	if (!ProductAddon) return renderTemplate(res, req, "addon.ejs", {product: null});
  	var SellerUser = await UserProfile.findOne({ sid: ProductAddon.seller });
  	if (!SellerUser) return renderTemplate(res, req, "addon.ejs", {product: null});
	
  	renderTemplate(res, req, "buy.ejs", {product: ProductAddon, seller: SellerUser});

});

app.get("/review/:id", checkAuth, async (req, res) => {
	if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
    var ProductAddon = await ProductProifle.findOne({ id: req.params["id"] });
    if (!ProductAddon) return renderTemplate(res, req, "addon.ejs", {product: null});
    var SellerUser = await UserProfile.findOne({ sid: ProductAddon.seller });
    if (!SellerUser) return renderTemplate(res, req, "addon.ejs", {product: null});
    let edited = false
    for await (var value of ProductAddon.reviews.values()) {
      if (value.sid == req.user.steamid) {
        edited = true
        // renderTemplate(res, req, "review.ejs", {product: ProductAddon, seller: SellerUser, edited: value});
        renderTemplate(res, req, "error.ejs", {error: 'Вы уже оставляли отзыв'});
        return
      }
    }

    renderTemplate(res, req, "review.ejs", {product: ProductAddon, seller: SellerUser, edited: null});

});

app.post("/api/admin/disable/:id", checkAuth, async (req, res) => {

  let ids = req.params["id"]
  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  var Admin = await UserProfile.findOne({ sid: req.user.steamid })
  var ProductAddon = await ProductProifle.findOne({ id: ids })
  if (!ProductAddon) return res.send('Аддон не найден!')
  if (Admin.rank == 'rank rank-member') return res.send('Ты как это сделал? Ты не администрулькин')

  ProductAddon.allow = 'deny'
  ProductAddon.save()

})

app.post("/api/admin/enable/:id", checkAuth, async (req, res) => {

  let ids = req.params["id"]
  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  var Admin = await UserProfile.findOne({ sid: req.user.steamid })
  var ProductAddon = await ProductProifle.findOne({ id: ids })
  if (!ProductAddon) return res.send('Аддон не найден!')
  if (Admin.rank == 'rank rank-member') return res.send('Ты как это сделал? Ты не администрулькин')

  ProductAddon.allow = 'accept'
  ProductAddon.save()

})

app.post("/review/:id", checkAuth, async (req, res) => {

  var ProductAddon = await ProductProifle.findOne({ id: req.params["id"] });
  if (!ProductAddon) return renderTemplate(res, req, "error.ejs", {error: 'Ошибка 404'});
  if (!req.body.recommend) return renderTemplate(res, req, "error.ejs", {error: 'Вы не поставили рекомендацию'});
  if (!req.body.works) return renderTemplate(res, req, "error.ejs", {error: 'Вы не поставили работает ли аддон'});
  if (!req.body.message) return renderTemplate(res, req, "error.ejs", {error: 'Вы не написали отзыв'});

  let edited = false

  for await (var value of ProductAddon.reviews) {
    if (value.sid == req.user.steamid) {
      edited = true
      // value.status = req.body.recommend
      // value.work = req.body.works
      // value.msg = req.body.message
      // value.sid = req.user.steamid
      // value.name = req.user.username
      // ProductAddon.save()
      renderTemplate(res, req, "error.ejs", {error: 'Вы уже оставляли отзыв'});
      return
    }
  }

  if (!edited) {
    console.log('Отзыв оставлен')
  const reviewpost = {
      status: req.body.recommend,
      work: req.body.works,
      msg: req.body.message,
      sid: req.user.steamid,
      name: req.user.username,
  }

  ProductAddon.reviews.push(reviewpost);

  if (req.body.recommend == '0') {
    ProductAddon.negative++
  } else {
    ProductAddon.positive++
  }

  ProductAddon.save()
  res.redirect(`/addon/${ProductAddon.id}`)

  }

})

app.get("/api/user/:id", checkAuth, async (req, res) => {

  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  var User = await UserProfile.findOne({ sid: req.params["id"] });
  if (!User) return res.send('User not register')
  let balance = User.rub
  let steamid = User.sid
  let nickname = User.nickname
  let ban = User.banned
  
  res.send({balance,steamid,nickname,ban})

});

app.get("/api/purchases/:id", checkAuth, async (req, res) => {

  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  var User = await UserProfile.findOne({ sid: req.params["id"] });
  if (!User) return res.send('User not register')
  if (User.purchases.length == 0) return res.send('User not purchases')
  var buylist = JSON.stringify(User.purchases);
  res.send({buylist})

});

app.get("/api/addon/:id", checkAuth, async (req, res) => {

  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  var Product = await ProductProifle.findOne({ id: req.params["id"] });
  if (!Product) return res.send('Addon not register')
  var addon = JSON.stringify(Product);
  res.send({Product})
  
});

app.get("/downloads/:id", checkAuth, async (req, res) => {
  if (isNaN(req.params["id"])) return renderTemplate(res, req, "error.ejs", {error: 'Не найдено!'});
  var ProductAddon = await ProductProifle.findOne({ id: req.params["id"] });
  if (!ProductAddon) return renderTemplate(res, req, "addon.ejs", {product: null});
  var downloaduser = await UserProfile.findOne({ sid: req.user.steamid });
  if (!downloaduser) return renderTemplate(res, req, "addon.ejs", {product: null});

  if (ProductAddon.seller == req.user.steamid) return res.sendFile(`/root/gmodshop/dashboard/uploads/${ProductAddon.id}/addon/addon.zip`);

  let homie = false
  for await (var value of downloaduser.purchases.values()) {
    if (value == ProductAddon.id) {
      homie = true
      res.sendFile(`/root/gmodshop/dashboard/uploads/${ProductAddon.id}/addon/addon.zip`);
    }
  }

  if (!homie) return renderTemplate(res, req, "error.ejs", {error: 'У вас не куплен данный аддон'});

});

app.get('/site', function(req, res){
  res.sendFile(`/root/gmodshop/dashboard/site.css`);
});

app.get('/favicon.ico', function(req, res){
  res.sendFile(`/root/gmodshop/dashboard/favicon.ico`);
});

app.get('/sitejs', function(req, res){
  res.sendFile(`/root/gmodshop/dashboard/site.js`);
});

app.get('/bg', function(req, res) {

  res.sendFile('/root/gmodshop/dashboard/addon-bg-1.jpg')

})

app.get('/getpay', function(req, res) {

  res.redirect('/')

})

app2.post('/getpay', async (req, res) => {

  res.send('2ХХ ОК');
  console.log('============================================')

  var acc = await UserProfile.findOne({ sid: req.body.bill.customer['account'] });

  if (!acc) return false
  acc.rub = acc.rub + Math.round(req.body.bill.amount.value)
  acc.save()

  console.log(`Пополнение ${req.body.bill.customer['account']} на ${req.body.bill.amount.value}`)

});


function getResponseSuccess(res,message) {
    res.send(
        {
            result: {
                message: message
            }
        }
    );
}


function getResponseError(res,message) {
    res.send(
        {
            error: {
                code: -32000,
                message: message
            }
        }
    );
}

// app2.get('/getpay', async (req, res) => {
//   var request = req.query;
//   var method = request.method;
//   var params = request.params;
//   console.log(request)

//   if (method == 'check') {
//     getResponseSuccess(res, 'OK')
//   }
//   if (method == 'pay') {
//     getResponseError(res, 'Что-то пошло не так')
//   }

// })

// app2.post('/free-kassa', async (req, res) => {


// 	console.log('hello')

// })

app.get('/*', function(req, res){
	res.status(404);
	renderTemplate(res, req, "error", {error: 'Запрашиваемая страница не найдена'})
});

app.listen(port, () => console.log(`EJS app Started on port ${port}!`));
app2.listen(5000, () => console.log(`pay app Started on port 5000!`));

client.login(gmodconfig.discordtoken);