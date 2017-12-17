const LineConnect = require('./connect');
let LINE = require('./main.js');

const auth = {
	authToken: ' En8mCzo7LqmpbhWh2Xma.apGNZMzba418M2CeQxD9/G.1ShVtLQCqMHEDrLZd85XocgwD3TPlJ+FBnsz5+O8AVk=',
	certificate: 'f6452be701ad1468ef3c30d93b831f10783d84890e072f0825d6e50cccf0cfb5',
}
 let client =  new LineConnect(auth);
//let client =  new LineConnect();

client.startx().then(async (res) => {
	
	while(true) {
		try {
			ops = await client.fetchOps(res.operation.revision);
		} catch(error) {
			console.log('error',error)
		}
		for (let op in ops) {
			if(ops[op].revision.toString() != -1){
				res.operation.revision = ops[op].revision;
				LINE.poll(ops[op])
			}
		}
	}
});
