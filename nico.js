/*
 *
 * nico.js v0.01(2013/07/09)
 * http://unagiinu.net/app/nico
 *
 *
 * Copyright 2013, unagiinu.net
 * This content is released under the MIT License.
 * http://unagiinu.net/app/nico#license
 *
 */


/* --------------------------------------------------
 * Object Telopper
 * htmlソースの.telopperの数に応じて生成される
 *
 * 時計・テロップを保持し、タイミングに合わせてテロップを流したり
 * テロップの新規投稿を受け付けたりする。
 *--------------------------------------------------*/
var Telopper = function(id){

	//Telopper unique ID
	this.id = id;
	//Telopperの保持するテロップ（インスタンス化されているものを保持）
	this.telop = {};
	//Telopperの内部時計
	this.clock = 0;
	//Telopperの状態フラグ（0:停止時、1：再生時）
	this.state = 0;
	//外部テロップデータ保存用変数
	//Interval毎にここからインスタンス化するべきテロップがないか探す
	this.telopData = new Array();


	//jQueryセレクタキャッシュ
	this.OBJ = $("#" + this.id);
	//jQueryセレクタ
	this.OBJs= "#" + this.id;
	//ループ処理のインターバル(msec)
	this.INTERVAL = 20;
	//1ステップのテロップの移動距離（px）
	this.MOVEPX = 3.5;
	//時計セレクタキャッシュ
	this.CLOCKOBJ = $(this.OBJs + " .time");


	//コンストラクタ
	//ユーザーからの入力に対する応答をセットする
	this.setEvent();

	//モードチェック
	switch (this.checkMode()) {
	//外部JSON取得モード
	case 0:
		this.getJSON();
		break;

	//html内部テロップ引渡しモード
	case 1:
		this.getInternalTelop();
		break;
	}

	//自動再生するかを判断
	if(this.OBJ.attr("pause") === undefined){
		this.setLoop();
	}

}


Telopper.prototype = {

	/*
	 * テロッパー動作基幹メソッド
	 */
	//イベント処理の設定
	setEvent : function(){

		this.cnt = "0";
	    var self = this;


	    //投稿ボタン処理
		$( this.OBJs + " .post").bind("click",function(){
					self.makeTelop(self.cnt++,$(self.OBJs + " .postbody").val() );
					$(self.OBJs + " .postbody").val("");
		});

		//フォームフォーカス時エンター
		$( this.OBJs + " .postbody").bind("keypress",function(key){
			if(key.which == 13){
					self.makeTelop(self.cnt++,$(self.OBJs + " .postbody").val() );
					$(self.OBJs + " .postbody").val("");
			}
		});

		//スタートボタン
		$( this.OBJs + " .start").bind("click",function(){
			self.setLoop();
		});

		//ストップボタン
		$( this.OBJs + " .stop").bind("click",function(){
			self.stopLoop();
		});

	},

	//動作モードチェック
	checkMode : function (){

		if( $(this.OBJs + "> .telopContainer > div").length == 0){
			return 0; 	//this.mode=0:外部JSON取得モード
		} else {
			return 1; 	//this.mode=1:html内テロップを流すモード
		}
	},

	//ループ処理の設定
	setLoop : function(){
		if(this.state == 0){
			this.state = 1;	//テロッパー再生状況フラグを"再生"に設定
			this.Loop();
		}
	},

	Loop : function(){
		var self = this;
		this.timer = setTimeout(function(){self.Loop()},this.INTERVAL);

		//時計の更新関連
		this.clock += this.INTERVAL;
		this.CLOCKOBJ.val(parseInt(self.clock/1000));

		//テロップ移動処理
		for (var key in this.telop){
			telopID = this.telop[key].id;
			if(this.isOverflow(telopID)){
				$(this.OBJs + "_" + telopID).remove();
				delete self.telop[key];
			}
			this.moveTelop(telopID);
		}

		//新規テロップ確認処理
		this.checkTelop();

		//ループチェック
		if( this.OBJ.attr("looptime") == self.clock ){
			this.clock = 0;
		}
	},

	//ループ解除時の処理
	stopLoop : function(){
		if(this.state == 1){
			//テロッパー再生状況フラグを"停止"に設定
			this.state = 0;

			clearTimeout(this.timer);
		}

	},

	//外部JSONの取得
	getJSON : function (){
		var self = this;
		$.get(this.id + ".json" ,function(data){
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

	//内部テロップの取得
	getInternalTelop : function(){
		var telopsDump = $(this.OBJs + "> .telopContainer > div")

		for(var i=0; i < telopsDump.length; i++){
			if(this.telopData[telopsDump.eq(i).attr("time")] === undefined){
				this.telopData[telopsDump.eq(i).attr("time")] = new Array();
			}

			var thisElement = this.telopData[telopsDump.eq(i).attr("time")];
			thisElement[thisElement.length] = {
					id   : telopsDump.eq(i).attr("time") + "_" + i,
					body : telopsDump.eq(i).text(),
					style: telopsDump.eq(i).attr("style")
			}
		}
	},


	/*
	 * DOMの情報を引き出す関数群
	 */
	//Telopperの幅を返す
	width : function(){
		return this.OBJ.width();
	},
	//Telopperの高さを返す
	height : function(){
		return this.OBJ.height();
	},


	/*
	 * テロップ関連の関数群
	 */
	//テロップがテロッパーから溢れていないかチェック
	isOverflow : function(telopID){
		var telopOBJ = this.OBJs + "_" + telopID;

		if(	parseInt( $(telopOBJ).css("left") ) < - $(telopOBJ).width()  ){
			return true
		} else {
			return false;
		}

	},

	//テロップを1ステップ動かす
	moveTelop : function(telopID){
		var tpSelector = this.OBJs + "_" + telopID;
		var pos = parseInt($(tpSelector).css("left")) - this.MOVEPX;
		$(tpSelector).css({left: pos });
	},

	makeTelop : function(telopID,body,style){

		this.telop[telopID]  = new Telop(telopID,body,style,this.id);

		//htmlソースを書き出す
		$(this.OBJs + " .telopContainer" ).append( this.telop[telopID].print() );

		//テロップの初期位置設定とvisilityをvisibleに設定
		var trh = this.OBJ.height();
		var tph = $(this.OBJs + "_" + telopID).height();
		var vpos= parseInt( (parseInt( trh / tph ) - 2 ) * Math.random() ) *  tph ;
		$(this.OBJs + "_" + telopID).css({ top: vpos, left : this.width(), visibility : "visible" });

	},

	checkTelop : function() {
		if( this.telopData[this.clock] != undefined){
			for (var i=0; i < this.telopData[this.clock].length; i++) {
				this.makeTelop(this.telopData[this.clock][i].id, this.telopData[this.clock][i].body, this.telopData[this.clock][i].style);
			}
		}
	}

}

/* --------------------------------------------------
 * Object Telop
 * Telopperによって生成される
 *
 * id:テロップ固有のID、body:投稿内容、
 * style:CSSクラス名、telopperID:所属するTelopperID
 *--------------------------------------------------*/
var Telop = function(id,body,style,telopperID){
	//メンバ変数の設定（引数undefinedのときなどの例外処理を関数内でする）
	this.setValue("id", id);
	this.setValue("body", body);
	this.setValue("style", style);
	this.setValue("telopperID", telopperID)

	//CSSセレクタ
	this.OBJs= "#" + this.telopperID + "_" + this.telopID;
	this.OBJ = $(this.OBJs);

}


Telop.prototype = {

	//プロパティ設定用関数
	setValue : function(propertyName,value){
		if(value == null || value == undefined){
			value = "";
		}
		this[propertyName] = value;
	},

	//テロップのhtmlソースを出力する
	print : function(){
		return '<div id="' + this.telopperID + '_' + this.id + '" class="telop ' + this.style + '">'
				+ this.body + '</div>';
	}

}


//DOMツリー構築後処理
jQuery(document).ready( function(){

	var TlprArea = $(".telopArea").toArray();
	var TlprIns  = new Array();
	for (var key in TlprArea ){
		TlprIns[key] = new Telopper(TlprArea[key].id);
	}
});
