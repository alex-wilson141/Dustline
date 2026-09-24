export const CLASSES = {
 assault: {name:'Assault',weapon:'MK4 CARBINE',caliber:'5.56 × 45',capacity:30,reserve:180,reload:2.45,interval:.105,damage:38,recoil:.012,spread:.0025,automatic:true,speed:1,zoom:46,armor:.82,bandages:2,description:'Balanced protection and mobility.',loadout:'MK4 carbine · 30-round magazine · 2 field dressings'},
 marksman: {name:'Marksman',weapon:'MK4 DMR',caliber:'5.56 × 45',capacity:20,reserve:100,reload:3.0,interval:.3,damage:78,recoil:.023,spread:.0008,automatic:false,speed:.94,zoom:20,armor:.9,bandages:2,description:'Precision rifle with a 4× optic.',loadout:'MK4 precision rifle · 20-round magazine · 4× optic · 2 dressings'},
 support: {name:'Support',weapon:'MK4 AUTOMATIC RIFLE',caliber:'5.56 × 45',capacity:75,reserve:225,reload:5.1,interval:.085,damage:35,recoil:.016,spread:.004,automatic:true,speed:.82,zoom:50,armor:.72,bandages:1,description:'Sustained fire and heavier armor.',loadout:'MK4 automatic rifle · 75-round drum · heavy armor · 1 dressing'},
 medic: {name:'Medic',weapon:'MK4 CQB',caliber:'5.56 × 45',capacity:30,reserve:120,reload:2.15,interval:.095,damage:34,recoil:.014,spread:.003,automatic:true,speed:1.08,zoom:48,armor:.95,bandages:5,description:'Fast movement and extra medical supplies.',loadout:'MK4 compact carbine · 30-round magazine · 5 dressings'}
};
export class WeaponState {
 constructor(config){this.configure(config);}
 configure(config){this.config=config;this.ammo=config.capacity;this.reserve=config.reserve;this.reloadRemaining=0;this.cooldown=0;}
 reload(){if(this.reloadRemaining>0||this.ammo>=this.config.capacity||this.reserve<=0)return false;this.reloadRemaining=this.config.reload;return true;}
 tick(dt){if(!Number.isFinite(dt)||dt<0)return false;this.cooldown=Math.max(0,this.cooldown-dt);if(this.reloadRemaining<=0)return false;this.reloadRemaining=Math.max(0,this.reloadRemaining-dt);if(this.reloadRemaining===0){const amount=Math.min(this.config.capacity-this.ammo,this.reserve);this.ammo+=amount;this.reserve-=amount;return true;}return false;}
 fire(){if(this.reloadRemaining>0||this.cooldown>0)return false;if(this.ammo<=0){this.reload();return false;}this.ammo--;this.cooldown=this.config.interval;return true;}
}
