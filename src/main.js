const LineAPI = require('./api');
const { Message, OpType, Location } = require('../curve-thrift/line_types');
let exec = require('child_process').exec;

const myBot = ['u17ce7606c05a31e55cfccb35487cfbf3','u683d36923b9d7437ab921802ee057026','u37e80fc1b2865fd049f16b4e175569b8','u2e8a00457a4f6a0e37b3140609cc7a95','u1a49cc167e3107826637a4a0052ceecc','u848339da8f4d7925af4edef909fc075f','u364ca880ccef9f2440b283c41ad098f9','ued6ec3eb223949283ce2ab345ae7be3e'];


function isAdminOrBot(param) {
    return myBot.includes(param);
}


class LINE extends LineAPI {
    constructor() {
        super();
        this.receiverID = '';
        this.checkReader = [];
        this.stateStatus = {
            cancel: 0,
            kick: 0,
            qr: 0,
            protect: 0,
        }
    }

    getOprationType(operations) {
        for (let key in OpType) {
            if(operations.type == OpType[key]) {
                if(key !== 'NOTIFIED_UPDATE_PROFILE') {
                    console.info(`[* ${operations.type} ] ${key} `);
                }
            }
        }
    }

    poll(operation) {
        if(operation.type == 25 || operation.type == 26) {
            const txt = (operation.message.text !== '' && operation.message.text != null ) ? operation.message.text : '' ;
            let message = new Message(operation.message);
            this.receiverID = message.to = (operation.message.to === myBot[0]) ? operation.message.from_ : operation.message.to ;
            Object.assign(message,{ ct: operation.createdTime.toString() });
            this.textMessage(txt,message)
        }

        if(operation.type == 13 && this.stateStatus.cancel == 1) {
            this.cancelAll(operation.param1);
        }

        if(operation.type == 19) { //ada kick
            // op1 = group nya
            // op2 = yang 'nge' kick
            // op3 = yang 'di' kick
            if(isAdminOrBot(operation.param3)) {
                this._invite(operation.param1,[operation.param3]);
            }
            if(!isAdminOrBot(operation.param2)){
                this._kickMember(operation.param1,[operation.param2]);
            } 

        }
      
        
        if(operation.type == 11 && this.stateStatus.protect == 1) {
            if(!isAdminOrBot(operation.param2)) {
                this._kickMember(operation.param1,[operation.param2]);
            }
        }
      
        if(operation.type == 13 && this.stateStatus.protect == 1) {
            if(!isAdminOrBot(operation.param2)) {
                this._kickMember(operation.param1,[operation.param2]);
            }
        }
      
        if(operation.type == 16){
          let seq = new Message();
          seq.to = operation.param1;
          seq.text = "Terimaksih telah mengundang saya ke Groupmu 😎😎😎\n\nsilahkan ketik (Help) untuk mengetahui Fitur kami.\n\nJangan lupa Add creator kami👍"
              this._client.sendMessage(0, seq);
        }
      
        if(operation.type == 17){
          let seq = new Message();
          seq.to = operation.param1;
          seq.text = "Welcome to the group, Jangan Lupa Bahagia :*"
              this._client.sendMessage(0, seq);
        }
      
        if(operation.type == 15){
          let seq = new Message();
          seq.to = operation.param1;
          seq.text = "Yach..,kabur"
              this._client.sendMessage(0, seq);
       }
      
        if(operation.type == 19){
          let seq = new Message();
          seq.to = operation.param1;
          seq.text = "awas..,r"
              this._client.sendMessage(0, seq);
        }
      
        if(operation.type == 15) { //Ada Leave
             // op1 = groupnya
             // op2 = yang 'telah' leave
             if(isAdminOrBot(operation.param2));
                 this._invite(operation.param1,[operation.param2]);
             }
      
        if(operation.type == 25){
                 this._client.removeAllMessages(operation.param1);
             }
      
        if(operation.type == 26){
                 this._client.removeAllMessages(operation.param1);
             }
    
 
        if(operation.type == 55){ //ada reader

            const idx = this.checkReader.findIndex((v) => {
                if(v.group == operation.param1) {
                    return v
                }
            })
            if(this.checkReader.length < 1 || idx == -1) {
                this.checkReader.push({ group: operation.param1, users: [operation.param2], timeSeen: [operation.param3] });
            } else {
                for (var i = 0; i < this.checkReader.length; i++) {
                    if(this.checkReader[i].group == operation.param1) {
                        if(!this.checkReader[i].users.includes(operation.param2)) {
                            this.checkReader[i].users.push(operation.param2);
                            this.checkReader[i].timeSeen.push(operation.param3);
                        }
                    }
              }
            }
        }

        if(operation.type == 13) { // diinvite
            if(isAdminOrBot(operation.param2)) {
                return this._acceptGroupInvitation(operation.param1);
            } else {
                return this._cancel(operation.param1,myBot);
            }
        }
        this.getOprationType(operation);
    }
  
    async cancelAll(gid) {
        let { listPendingInvite } = await this.searchGroup(gid);
        if(listPendingInvite.length > 0){
            this._cancel(gid,listPendingInvite);
        }
    }

    async searchGroup(gid) {
        let listPendingInvite = [];
        let thisgroup = await this._getGroups([gid]);
        if(thisgroup[0].invitee !== null) {
            listPendingInvite = thisgroup[0].invitee.map((key) => {
                return key.mid;
            });
        }
        let listMember = thisgroup[0].members.map((key) => {
            return { mid: key.mid, dn: key.displayName };
        });

        return { 
            listMember,
            listPendingInvite
        }
    }

    setState(seq) {
        if(isAdminOrBot(seq.from)){
            let [ actions , status ] = seq.text.split(' ');
            const action = actions.toLowerCase();
            const state = status.toLowerCase() == 'on' ? 1 : 0;
            this.stateStatus[action] = state;
            this._sendMessage(seq,`Status: \n${JSON.stringify(this.stateStatus)}`);
        } else {
            this._sendMessage(seq,`Anda bukan Admin\nDaftar kan dulu ke...\nhttp://line.me/ti/p/~aries_jabrik`);
        }
    }

    mention(listMember) {
        let mentionStrings = [''];
        let mid = [''];
        for (var i = 0; i < listMember.length; i++) {
            mentionStrings.push('@'+listMember[i].displayName+'\n');
            mid.push(listMember[i].mid);
        }
        let strings = mentionStrings.join('');
        let member = strings.split('@').slice(1);
        
        let tmp = 0;
        let memberStart = [];
        let mentionMember = member.map((v,k) => {
            let z = tmp += v.length + 1;
            let end = z - 1;
            memberStart.push(end);
            let mentionz = `{"S":"${(isNaN(memberStart[k - 1] + 1) ? 0 : memberStart[k - 1] + 1 ) }","E":"${end}","M":"${mid[k + 1]}"}`;
            return mentionz;
        })
        return {
            names: mentionStrings.slice(1),
            cmddata: { MENTION: `{"MENTIONEES":[${mentionMember}]}` }
        }
    }

    async leftGroupByName(payload) {
        let gid = await this._findGroupByName(payload);
        for (var i = 0; i < gid.length; i++) {
            this._leaveGroup(gid[i]);
        }
    }
    
    async recheck(cs,group) {
        let users;
        for (var i = 0; i < cs.length; i++) {
            if(cs[i].group == group) {
                users = cs[i].users;
            }
        }
        
        let contactMember = await this._getContacts(users);
        return contactMember.map((z) => {
                return { displayName: z.displayName, mid: z.mid };
            });
    }

    removeReaderByGroup(groupID) {
        const groupIndex = this.checkReader.findIndex(v => {
            if(v.group == groupID) {
                return v
            }
        })

        if(groupIndex != -1) {
            this.checkReader.splice(groupIndex,1);
        }
    }

    async textMessage(textMessages, seq) {
        let [ cmd, ...payload ] = textMessages.split(' ');
        payload = payload.join(' ');
        let txt = textMessages.toLowerCase();
        let messageID = seq.id;
      
        var group = await this._getGroup(seq.to); 
        
        var a_p = "";
        var hari_ini = new Date();
        var jam = hari_ini.getHours();
        var wib = (jam-1);
        var menit = hari_ini.getMinutes();
        var detik = hari_ini.getSeconds();

        var bulanku = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        var hariku = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jum&#39;at', 'Sabtu'];
        var date = new Date();
        var tanggal = date.getDate();
        var bulan = date.getMonth(),
            bulan = bulanku[bulan];
        var hariIni = date.getDay(),
            hariIni = hariku[hariIni];
        var tahunku = date.getYear();
        var tahun = (tahunku < 1000) ? tahunku + 1900 : tahunku;
      
        if(group.preventJoinByTicket==false&& this.stateStatus.qr == 1 && isAdminOrBot(seq.from)){     
            this._sendMessage(seq,'Jgn buka QR...,\nntar dikick lho...!!');
            group.preventJoinByTicket=true;
            await this._updateGroup(group);
         }  
      
        if (txt== 'g creator'){                    
            seq.contentType=13;
            seq.contentMetadata = {mid: group.creator.mid};
            this._client.sendMessage(1,seq);
         } 
      
        if(txt == 'g info') {
          let a = group.name;
          let b = group.creator.displayName;
          let c = group.id;
          let d = group.members.length;
          this._sendMessage(seq, `🔛GROUP_NAME 👉 ${a}\n\n🔛GROUP_CREATOR\n👉 ${b} 👌\n\n🔛GROUP_ID\n👉 ${c}\n\n🔛GROUP_MEMBER\n👉${d} Ekor(👍)`)
        }
      
        if(txt == 'bot creator') {
        	seq.contentType=13;
            seq.contentMetadata = { mid: 'u17ce7606c05a31e55cfccb35487cfbf3' };
            this._client.sendMessage(1, seq);
        }
      
        if(txt == 'admin1') {
        	seq.contentType=13;
            seq.contentMetadata = { mid: 'u17ce7606c05a31e55cfccb35487cfbf3' };
            this._client.sendMessage(1, seq);
        }
      
        if(txt == 'admin2') {
        	seq.contentType=13;
            seq.contentMetadata = { mid: 'ued6ec3eb223949283ce2ab345ae7be3e' };
            this._client.sendMessage(1, seq);
        }
      
        if(cmd == 'cancel') {
            if(payload == 'group') {
                let groupid = await this._getGroupsInvited();
                for (let i = 0; i < groupid.length; i++) {
                    this._rejectGroupInvitation(groupid[i])                    
                }
                return;
            }
            if(this.stateStatus.cancel == 1) {
                this.cancelAll(seq.to);
            }
        }
       
        if(txt == 'waktu') {
            this._sendMessage(seq, `🔛Sekarang Menunjukkan Pukul🔛\n\n⏱⏱⏱ ${wib}:${menit}:${detik} WIB ⏱⏱⏱`);
            }

        if(txt == 'date'){
            this._sendMessage(seq, `${hariIni}, ${tanggal} ${bulan} ${tahun}`);
            }
      
        if(txt == 'respon') {
            this._sendMessage(seq, '😎😎😎');
           }
      
         if(txt == 'help') {
	          this._sendMessage(seq, '==============================\n αll cσmmαnd\n==============================\n☞ Myid\n☞ me\n☞ Respon all\n☞ Help/Keyword/Key/Bantuan\n☞ Creator \n☞ Admin /Admin 2\n\nG info\nG creatot\n☞ Speed\n☞ Read\n☞ Cctv/Sider/Intip/Looser\n   (Lihat Pembacaan Read)\n☞ Clear\n\n==============================\n α∂мιи ¢σммαи∂\n==============================\n☞ (name bot)Respon\n☞ Open\n☞ Close\n☞ (Nama Bot) Bye\n☞ (Nama Bot) spam\n☞ Absen/taq all\n☞ Kick On/Off\n☞ Cancel On/Off\n☞ Nk「@」\n☞ Kickall (Kick On Terlebih Dahulu)\n\n==============================\n฿Ɏ ₮Ɇ₳₥ ฿Ø₮\n==============================');
           }
      
        if(txt == 'speed') {
            const curTime = (Date.now() / 10000);
            await this._sendMessage(seq,'██▓▓▒▒ Load_70%');
            const rtime = (Date.now() / 10000) - curTime;
            await this._sendMessage(seq, `${rtime} /dtk`);
        }

        if(txt === 'kernel') {
            exec('uname -a;ptime;id;whoami',(err, sto) => {
                this._sendMessage(seq, sto);
            })
        }

        if(txt === 'fuck' && this.stateStatus.kick == 1 && isAdminOrBot(seq.from)) {
            let { listMember } = await this.searchGroup(seq.to);
            for (var i = 0; i < listMember.length; i++) {
                if(!isAdminOrBot(listMember[i].mid)){
                    this._kickMember(seq.to,[listMember[i].mid])
                }
            }
        }

        if(txt == 'point') {
            this._sendMessage(seq, `cek 🔭🔭🔭 ${group.name}....\nketik [cctv] untuk tag sidernya`);
            this.removeReaderByGroup(seq.to);
        }
      
        if(txt == 'absen' && isAdminOrBot (seq.from)) {
            let rec = await this._getGroup(seq.to);
            const mentions = await this.mention(rec.members);
            seq.contentMetadata = mentions.cmddata;
            await this._sendMessage(seq,mentions.names.join(''));
        }      
      
        if(txt == 'clear') {
            this.checkReader = []
            this._sendMessage(seq, `Mengulang sider...`);        }  

        if(txt == 'cctv'){
            await this._sendMessage(seq, `nih CCTV ny\n${group.name}\n👇👇👇👇👇👇👇`);
            let rec = await this.recheck(this.checkReader,seq.to);
            const mentions = await this.mention(rec);
            seq.contentMetadata = mentions.cmddata;
            await this._sendMessage(seq,mentions.names.join(''));
       } 
       
        if(txt == 'setpoint for check reader .') {
            this.searchReader(seq);
        }

        if(txt == 'clearall') {
            this.checkReader = [];
        }

        const action = ['cancel on','cancel off','kick on','kick off','qr on','qr off','protect on','protect off']
        if(action.includes(txt)) {
            this.setState(seq)
        }
	
        if(txt == 'myid') {
            this._sendMessage(seq,`Your ID: ${seq.from}`);
        }

        if(txt == 'speedtest' && isAdminOrBot(seq.from)) {
            exec('speedtest-cli --server 6581',(err, res) => {
                    this._sendMessage(seq,res)
            })
        }

        const joinByUrl = ['open','close'];
        if(joinByUrl.includes(txt)) {
            this._sendMessage(seq,`sabar bosquh...😎😎😎`);
            let updateGroup = await this._getGroup(seq.to);
            updateGroup.preventJoinByTicket = true;
            if(txt == 'open') {
                updateGroup.preventJoinByTicket = false;
                const groupUrl = await this._reissueGroupTicket(seq.to)
                this._sendMessage(seq,`Line group = line://ti/g/${groupUrl}`);
            }
            await this._updateGroup(updateGroup);
        }

        if(cmd == 'join') { //untuk join group pake qrcode contoh: join line://anu/g/anu
            const [ ticketId ] = payload.split('g/').splice(-1);
            let { id } = await this._findGroupByTicket(ticketId);
            await this._acceptGroupInvitationByTicket(id,ticketId);
        }
      
        if(txt == 'gift') {
           	seq.contentType = 9
            seq.contentMetadata = {'PRDID': 'a0768339-c2d3-4189-9653-2909e9bb6f58','PRDTYPE': 'THEME','MSGTPL': '5'};
            this._client.sendMessage(1, seq);
            }

      
        if(cmd == 'santet' && isAdminOrBot(seq.from)) {
          let target = payload.replace('@','');
          let group = await this._getGroups([seq.to]);
          let gm = group[0].members;
            for(var i = 0; i < gm.length; i++){
                if(gm[i].displayName == target){
                        target = gm[i].mid;
                }
            }
            this._kickMember(seq.to,[target]);
        }

        if(cmd == 'spm' && isAdminOrBot(seq.from)) { // untuk spam invite contoh: spm <mid>
            for (var i = 0; i < 4; i++) {
                this._createGroup(`spam`,[payload]);
            }
        }  
      
        if(cmd == 'spam' && isAdminOrBot(seq.from)) {
            for (var i= 1; i < 20; i++) {
                this._sendMessage(seq, 'I Love U all~');
            }
        }  
      
        if(txt == 'bye' && isAdminOrBot(seq.from)) {
            let txt = await this._sendMessage(seq, `Sampai Jumpa Lagi Familly 👉 ${group.name} 👈....\nSampai Jumpa Lagi...🙋🙋🙋`);
            this._leaveGroup(seq.to);                                    
         }
      
       

        if(cmd == 'lirik') {
            let lyrics = await this._searchLyrics(payload);
            this._sendMessage(seq,lyrics);
        }

        if(cmd === 'ip') {
            exec(`curl ipinfo.io/${payload}`,(err, res) => {
                const result = JSON.parse(res);
                if(typeof result.error == 'undefined') {
                    const { org, country, loc, city, region } = result;
                    try {
                        const [latitude, longitude ] = loc.split(',');
                        let location = new Location();
                        Object.assign(location,{ 
                            title: `Location:`,
                            address: `${org} ${city} [ ${region} ]\n${payload}`,
                            latitude: latitude,
                            longitude: longitude,
                            phone: null 
                        })
                        const Obj = { 
                            text: 'Location',
                            location : location,
                            contentType: 0,
                        }
                        Object.assign(seq,Obj)
                        this._sendMessage(seq,'Location');
                    } catch (err) {
                        this._sendMessage(seq,'Not Found');
                    }
                } else {
                    this._sendMessage(seq,'Location Not Found , Maybe di dalem goa');
                }
            })
        }

        if(cmd == '/ig') {
            let { userProfile, userName, bio, media, follow } = await this._searchInstagram(payload);
            await this._sendFileByUrl(seq,userProfile);
            await this._sendMessage(seq, `${userName}\n\nBIO:\n${bio}\n\n\uDBC0 ${follow} \uDBC0`)
            if(Array.isArray(media)) {
                for (let i = 0; i < media.length; i++) {
                    await this._sendFileByUrl(seq,media[i]);
                }
           } else {
                this._sendMessage(seq,media);
            }
        }


    }

}

module.exports = new LINE();
