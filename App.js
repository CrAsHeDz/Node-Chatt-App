var http = require("http");
var fs = require('fs');
var url = require('url');
var event = require('events');
var socket = require('socket.io');
var sys = require('sys');
var exec = require('child_process').exec;
var child;
var eventEmitter = new event.EventEmitter();

var UsersList=[];
var activeUsers=[];
var chatHistory=[];


var server = http.createServer(function(req,res){
	var path = url.parse(req.url).pathname;

	switch(path){

		case '/':
			res.writeHead(200,{'content-type':'text/plain'});
			res.write('Active Users!\n','utf8');

			var length = activeUsers.length;
			
			for(var i=0;i<length;i++){
				res.write(activeUsers[i]+'\n');
			}
			
			res.end();
		break;

		case '/list':
			fs.readFile(__dirname+'/Database/db.json', 'utf8',function(err,data){
				var list = JSON.parse(data);
				console.log(list);
				res.end(JSON.stringify(list));
			});
		break;

		case '/users':
			fs.readFile(__dirname+'/Pages/UsersOnline.html', 'utf8',function(err,data){
				res.writeHead(200,{'content-type':'text/html'});
				res.write(data,'utf8');
				res.end();
			});
		break;

		case '/socket':
			fs.readFile(__dirname+'/Pages/Socket.html', 'utf8',function(err,data){
			res.writeHead(200,{'content-type':'text/html'});
			res.write(data,'utf8');
			res.end();
		});
		break;
		
		case '/register':
			fs.readFile(__dirname+'/Pages/Register.html', 'utf8',function(err,data){
			res.writeHead(200,{'content-type':'text/html'});
			res.write(data,'utf8');
			res.end();
		});
		break;

		case '/login':
			fs.readFile(__dirname+'/Pages/Login.html', 'utf8',function(err,data){
			res.writeHead(200,{'content-type':'text/html'});
			res.write(data,'utf8');
			res.end();
		});
		break;
	}
	
	
});

server.listen(8081);
console.log('Listening at 192.168.1.102:8081');

var io = socket.listen(server);

io.sockets.on('connection',function(socket){

	socket.emit('message',{'message':'Connected','chatHistory':chatHistory});
	console.log('connected: '+socket.id);

	socket.on('register',function(data){
		var exists=false;
		console.log(data.email+'\n'+data.password+'\nTotal users: '+UsersList.length);
		//if no users are registered
		if(UsersList.length==0){
			var obj = {email:data.email, password:data.password};
				UsersList.push(obj);
				console.log("First user registered");
				socket.emit('successfull',{'result':"User registered"});
		}else{
			//if There are many users in list
			for(var i=0;i<UsersList.length;i++){
					if(UsersList[i].email === data.email){
					console.log("User already registered");
					socket.emit('unsuccessfull',{'result':"User already registered"});
					exists=true;
					break;
				}
			}//for ends
			if(!exists){
				var obj = {email:data.email, password:data.password, isOnline:false};
					UsersList.push(obj);
					console.log("User registered");
					exists=false;
					socket.emit('successfull',{'result':"User registered"});
			}
		}
		
	});

	socket.on('login',function(data){
		var length = UsersList.length;
		var status=false;
		for(var i=0;i<length;i++){
			if(UsersList[i].email === data.email && UsersList[i].password === data.password && !UsersList[i].isOnline){
				UsersList[i].socketID=socket.id;
				UsersList[i].isOnline=true;
				activeUsers.push(UsersList[i].email);
				socket.emit('logged',{'result':data.email});
				io.sockets.emit('update',{'result':activeUsers});
				status=true;
				break;
			}
		}
		if(!status){
			socket.emit('err',{'result':'Invalid login details'});
		}
		status=false;
	});
	socket.on('logout',function(data){
		var length = UsersList.length;
	
		for(var i=0;i<length;i++){
			if(UsersList[i].email === data.email){
				UsersList[i].socketID=null;
				UsersList[i].isOnline=false;
				break;		
			}
		}//end for

		for(var i=0;i<activeUsers.length;i++){
			if(activeUsers[i] === data.email){
				activeUsers.splice(i,1);
				break;
			}
		}//end for
		socket.emit('loggedout',{'result':'logged out'});
		io.sockets.emit('update',{'result':activeUsers});
	});
	socket.on('command',function(data){
		console.log(data.cmd+" from: "+socket.id);
		child = exec(data.cmd,function(error,stdout,stderr){
				sys.print('stdout: '+stdout);
				sys.print('stderr: '+stderr);
				if(error!==null){
					console.log('exec error: '+error); 
					socket.emit('error',{'e':error});
				}else{socket.emit('executed',{'executed':stdout+'\n'+stderr});}	
		});
	});

	socket.on('chat',function(data){
		io.sockets.emit('chat',{'sender':data.sender, 'message':data.message});
		var chat = {'sender':data.sender,'message':data.message};
		chatHistory.push(chat);
		if(chatHistory.length>10){
			chatHistory.splice(0,5);
		}
	});
	socket.on('typing',function(data){
		io.sockets.emit('istyping',{'sender':data.sender});	
	});
	socket.on('notyping',function(data){
		io.sockets.emit('notyping',{'sender':data.sender});	
	});

	socket.on('disconnect',function(){
		console.log('disconnected: '+socket.id);
		var length = UsersList.length;
		var email;
		for(var i=0;i<length;i++){
			if(UsersList[i].socketID === socket.id){
				UsersList[i].socketID=null;
				UsersList[i].isOnline=false;
				email = UsersList[i].email;
				break;		
			}
		}//end for

		for(var i=0;i<activeUsers.length;i++){
			if(activeUsers[i] === email){
				activeUsers.splice(i,1);
				break;
			}
		}//end for
		io.sockets.emit('update',{'result':activeUsers});
	});
		
}); //io.sockets.on


