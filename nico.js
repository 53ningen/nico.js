/*
 *
 * nico.js v0.00
 * http://unagiinu.net/app/nico
 *
 * Copyright 2013, Yuki Yanagi
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


	//jQueryセレクタ定数
	this.OBJ = "#" + this.id;
	//ループ処理のインターバル(msec)
	this.INTERVAL = 10;
	//1ステップのテロップの移動距離（px）
	this.MOVEPX = 2;


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
		$(this.OBJ + " .post").bind("click",function(){
			//【考え中】makeTelopのユニークID指定をどうつくるか・・・。
					self.makeTelop(self.cnt++,$(self.OBJ + " .postbody").val() );
					$(self.OBJ + " .postbody").val("");
		});

		//フォームフォーカス時エンター
		$(this.OBJ + " .postbody").bind("keypress",function(key){
			if(key.which == 13){
					self.makeTelop(self.cnt++,$(self.OBJ + " .postbody").val() );
					$(self.OBJ + " .postbody").val("");
			}
		});

		//スタートボタン
		$(this.OBJ + " .start").bind("click",function(){
			self.setLoop();
		});

		//ストップボタン
		$(this.OBJ + " .stop").bind("click",function(){
			self.stopLoop();
		});

	},

	//動作モードチェック
	checkMode : function (){
		if( $(this.OBJ + "> .telopContainer div").length == 0){
			return 0; 	//this.mode=0:外部JSON取得モード
		} else {
			return 1; 	//this.mode=1:html内テロップを流すモード
		}
	},

	//ループ処理の設定
	setLoop : function(){
		if(this.state == 0){
			//テロッパー再生状況フラグを"再生"に設定
			this.state = 1;

			var self = this;
			this.interval = setInterval( (function(){
				//時計の更新関連
				self.clock += self.INTERVAL;
				$(self.OBJ + "> .time").val((self.clock - self.clock % 1000)/1000);

				//テロップ移動処理
				for (var key in self.telop){
					telopID = self.telop[key].id;
					self.moveTelop(telopID)
					if(self.isOverflow(telopID)){
						$(self.OBJ + "_" + telopID).remove();
						//連想配列への破壊的操作：バグ要注意
						delete self.telop[key]
					}
				}

				//新規テロップ確認処理
				self.checkTelop();
			}), self.INTERVAL);
		}
	},

	//ループ解除時の処理
	stopLoop : function(){
		if(this.state == 1){
			//テロッパー再生状況フラグを"停止"に設定
			this.state = 0;

			clearInterval(this.interval);
		}

	},

	//外部JSONの取得
	//データ保持の形を変える！！！！！！！
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
		var telopsDump = $(this.OBJ + "> .telopContainer > div")

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
		return $(this.OBJ).width();
	},
	//Telopperの高さを返す
	height : function(){
		return $(this.OBJ).height();
	},


	/*
	 * テロップ関連の関数群
	 */
	//テロップがテロッパーから溢れていないかチェック
	isOverflow : function(telopID){
		var telopOBJ = this.OBJ + "_" + telopID;

		if(	parseInt( $(telopOBJ).css("left") ) < - $(telopOBJ).width()  ){
			return true
		} else {
			return false;
		}

	},

	//テロップを1ステップ動かす
	moveTelop : function(telopID){
		var tpSelector = this.OBJ + "_" + telopID;
		var pos = parseInt($(tpSelector).css("left")) - this.MOVEPX;
		$(tpSelector).css({left: pos });
	},

	makeTelop : function(telopID,body,style){

		this.telop[telopID]  = new Telop(telopID,body,style,this.id);

		//htmlソースを書き出す
		$(this.OBJ + " .telopContainer" ).append( this.telop[telopID].print() );

		//テロップの初期位置設定とvisilityをvisibleに設定
		var trh = $(this.OBJ).height();
		var tph = $(this.OBJ + "_" + telopID).height();
		var vpos= parseInt( (parseInt( trh / tph ) - 1 ) * Math.random() ) *  tph ;
		$(this.OBJ + "_" + telopID).css({ top: vpos, left : this.width(), visibility : "visible" });

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
	this.OBJ = "#" + this.id;

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

/* --------------------------------------------------
 * その他
 *--------------------------------------------------*/
//htmlタグ・エスケープ処理
htmlspecialchars = function(str){
		str = str.replace(/&/g,"&amp;")
				  .replace(/"/g,"&quot;").replace(/'/g,"&#039;")
				  .replace(/</g,"&lt;").replace(/>/g,"&gt;");
	    return str;
}


//DOMツリー構築後処理
jQuery(document).ready( function(){


	//【要修正】Debug用にvarを付けてないので公開時に隠蔽！
	TlprArea = $(".telopArea").toArray();
	TlprIns  = new Array();
	for (var key in TlprArea ){
		TlprIns[key] = new Telopper(TlprArea[key].id);
	}



});



