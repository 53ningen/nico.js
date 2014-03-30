/*
 * nico.js v0.02(2013/07/09)
 * http://unagiinu.net/app/nico
 *
 * Copyright 2013, unagiinu.net
 * This content is released under the MIT License.
 * http://unagiinu.net/app/nico#license
 *
 * @author	unagiinu
 * @version	0.02
 * @license MIT
 */


/* --------------------------------------------------
 * Object Telopper
 * htmlソースの.telopperの数に応じて生成される
 *
 * 時計・テロップを保持し、タイミングに合わせてテロップを流したり
 * テロップの新規投稿を受け付けたりする。
 *--------------------------------------------------*/
Telopper = function(telopperID){
	//定数定義
	this.INTERVAL = 10;
	this.MOVEPX   = 2;

	//変数定義
	this.id = telopperID
	this.clock = 0;
	this.state = 0;
	this.telop = {};
	this.telopData = new Array();
	this.OBJ = $("#" + telopperID);
	this.width = this.OBJ.children(".base").width();
	this.height= this.OBJ.children(".base").height();

	//テロップソース判定変数
	this.hasTelop = this.OBJ.children(".telops").length > 0 ? true : false;
	//Loop判定変数
	this.isLoop = String(this.OBJ.data("loop")).match(/^[0-9.]+$/)>0 ? true : false;
	//自動再生開始判定変数
	this.isAutorun = this.OBJ.data("auto")=="false" ? false : true;

	//初期化処理
	this.init();

	//canvas関連変数
	this.cvs = this.OBJ.children("#" + this.id + "_cvs")[0];
	this.ctx = this.cvs.getContext("2d");
	this.tpsize = $(".telopper > canvas").css("font-size");
	this.ctx.font = "bold "+ this.tpsize + " " + $(".telopper > canvas").css("font-family");

	//ループ開始 or 待機状態へ
	if(this.isAutorun) this.setLoop();
};

Telopper.prototype = {

	init : function(){
		//canvas追加
		this.OBJ.append($("<canvas> </canvas>")
				.attr("width",this.width)
				.attr("height",this.height)
				.attr("id", this.id + "_cvs"));
		//テロップデータ読み取り
		this.hasTelop == true ?	this.getInternalTelop() : this.getJSON();

		//イベントのバインド
		this.setEvent()
	},

	setLoop : function(){
		if( this.state == 0 ){
			this.state = 1;
			this.Loop();
		}
	},

	Loop :function(){
		var self = this;
		this.timer = setTimeout(function(){self.Loop()},this.INTERVAL);
		this.clock += this.INTERVAL;
		this.OBJ.find(".time").val( parseInt(this.clock/1000) );

		//新規テロップのチェック
		this.checkTelop(key);

		//Canvasのクリア
		this.cvsClear();

		for(var key in this.telop){
			//オーバーフローチェック
			if(this.isOverflow(key)){
				delete this.telop[key];
			} else{
				//最終描画の削除
				//this.clearTelop(key);
				//テロップの位置の描画と更新
				this.moveTelop(key);
			}
		}

		//ループチェック
		if( this.isLoop==true && this.clock == this.OBJ.data("loop") ){
			this.clock = 0;
		}
	},

	stopLoop: function(){
		if(this.state == 1){
			clearTimeout(this.timer);
			this.state = 0;
		}
	},

	setEvent: function(){

		this.cnt = "0";
	    var self = this;

		//投稿ボタン処理
		this.OBJ.find(".post").bind("click",function(){
					self.makeTelop(self.cnt++, self.OBJ.find(".postbody").val() );
					self.OBJ.find(".postbody").val("");
		});

		//フォームフォーカス時エンター
		this.OBJ.find(".postbody").bind("keypress",function(key){
			if(key.which == 13){
					self.makeTelop(self.cnt++, self.OBJ.find(".postbody").val() );
					self.OBJ.find(".postbody").val("");
			}
		});

		//スタートボタン
		self.OBJ.find(".start").bind("click",function(){
			self.setLoop();
		});

		//ストップボタン
		self.OBJ.find(".stop").bind("click",function(){
			self.stopLoop();
		});
	},

	/*
	 * 外部JSONを取得してtelopDtata[]に格納
	 * キーはテロップ出力時間
	 */
	getJSON : function (){
		var self = this;
		jQuery.get(this.id + ".json" ,function(data){
			var telopsDump = $.secureEvalJSON($.toJSON(data));

			for(var i=0; i < telopsDump.length; i++){
				if(self.telopData[telopsDump[i].time] === undefined){
					self.telopData[telopsDump[i].time] = new Array();
				}

				var thisElement = self.telopData[eval(telopsDump[i].time)];
				thisElement[thisElement.length] = {
						id   : telopsDump[i].id,
						body : telopsDump[i].body,
						style: telopsDump[i].style
				}
			}
		});
	},

	/*
	 * 内部テロップを取得してtelopData[]に格納
	 * キーはテロップ出力時間
	 */
	getInternalTelop : function(){
		var telopsDump = this.OBJ.children(".telops").children("div");

		for(var i=0; i < telopsDump.length; i++){
			if(this.telopData[telopsDump.eq(i).data("time")] === undefined){
				this.telopData[telopsDump.eq(i).data("time")] = new Array();
			}

			var thisElement = this.telopData[telopsDump.eq(i).data("time")];
			thisElement[thisElement.length] = {
					id   : telopsDump.eq(i).data("time") + "_" + i,
					body : telopsDump.eq(i).text(),
					style: telopsDump.eq(i).attr("style")
			}
		}
	},

	/*
	 * キャンバスの全領域クリア
	 */
	cvsClear : function(){
		this.ctx.clearRect(0,0,this.width,this.height);
	},

	/*
	 * テロップの生成
	 */
	makeTelop :function(telopID,body,style){
		var tph  = parseInt(this.tpsize);
		var vpos = parseInt( (parseInt( this.height / tph ) ) * Math.random() ) *  tph ;
		this.telop[telopID]		= new Telop(telopID,body,style);
		this.telop[telopID] = {
				body: body,
				w	: this.ctx.measureText(body)["width"],
				h   : this.tpsize,
				x	: this.width,
				y   : vpos + tph
		}
	},

	clearTelop :function(telopID){
		var tp = this.telop[telopID];
		this.ctx.clearRect(tp.x, tp.y, tp.x+tp.w, tp.y+tp.h );
	},

	moveTelop : function(telopID){
		var tp = this.telop[telopID];
		//この部分あんまりパフォーマンスよくない
		//fillStyle変更回数をなるべく減らす
		this.ctx.fillStyle = ("black");
		this.ctx.fillText(tp.body, tp.x + 2, tp.y + 2)
		this.ctx.fillStyle = ("white");
		this.ctx.fillText(tp.body,tp.x,tp.y)
		tp.x -= this.MOVEPX;
	},

	checkTelop : function(){
		if( this.telopData[this.clock] != undefined){
			for (var i=0; i < this.telopData[this.clock].length; i++) {
				this.makeTelop(this.telopData[this.clock][i].id, this.telopData[this.clock][i].body, this.telopData[this.clock][i].style);
			}
		}
	},

	isOverflow : function(telopID){
		if(this.telop[telopID].x < -this.telop[telopID].w){
			return true;
		} else return false;
	}
};

/* --------------------------------------------------
 * Object Telop
 * Telopperによって生成される
 *
 * id:テロップ固有のID、body:投稿内容、
 * style:CSSクラス名
 *--------------------------------------------------*/
Telop = function(id,body,style){
	this.id 	= id;
	this.body 	= body;
	this.style  = style;
	this.x		= 0;
	this.y		= 0;
};


window.onload = function(){
	//ページ内テロッパー走査
	tlprIns = new Array();
	var tlprArr = $(".telopper").toArray();
	for (var key in tlprArr ){
		tlprIns[key] = new Telopper(tlprArr[key].id);
	}
};