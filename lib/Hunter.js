Object.defineProperty(exports,"__esModule",{value:true});var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};}();var _events=require('events');var _events2=_interopRequireDefault(_events);
var _immutable=require('immutable');var _immutable2=_interopRequireDefault(_immutable);
var _lodash=require('lodash');var _lodash2=_interopRequireDefault(_lodash);
var _APIError=require('./errors/APIError');var _APIError2=_interopRequireDefault(_APIError);
require('whatwg-fetch');function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj};}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function");}}function _possibleConstructorReturn(self,call){if(!self){throw new ReferenceError("this hasn't been initialised - super() hasn't been called");}return call&&(typeof call==="object"||typeof call==="function")?call:self;}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function, not "+typeof superClass);}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,enumerable:false,writable:true,configurable:true}});if(superClass)Object.setPrototypeOf?Object.setPrototypeOf(subClass,superClass):subClass.__proto__=superClass;}var






Hunter=function(_EventEmitter){_inherits(Hunter,_EventEmitter);






function Hunter(){_classCallCheck(this,Hunter);return _possibleConstructorReturn(this,(Hunter.__proto__||Object.getPrototypeOf(Hunter)).call(this));

}_createClass(Hunter,[{key:'off',value:function off(

event,listener){
this.removeListener(event,listener);
}},{key:'get',value:function get(


url,params,options){
return this.ajax(url,'GET',params,options);
}},{key:'post',value:function post(

url,params,options){
return this.ajax(url,'POST',params,options);
}},{key:'put',value:function put(

url,params,options){
return this.ajax(url,'PUT',params,options);
}},{key:'del',value:function del(

url,params,options){
return this.ajax(url,'DELETE',params,options);
}},{key:'ajax',value:function ajax(

url,method,params){var _this2=this;var options=arguments.length>3&&arguments[3]!==undefined?arguments[3]:{};var

headers=


options.headers,immutable=options.immutable,token=options.token;

url=(url||'').trim();
token=(token||'').trim();


method=(method||'GET').toUpperCase();


if(params&&method==='GET'){
url=url+'?'+this.queryString(params);
params=null;
}else if(params){
params=JSON.stringify(params);
}


if(token!==''){
headers=headers||{};
headers.Authorization='Bearer '+token;
}


var isJSON=false;

return fetch(url,{
method:method,
headers:headers,
body:params}).

then(function(response){
var regex=/application\/json/i;
var isJSON=regex.test(response.headers.get('Content-Type')||'');

if(isJSON){
return response.json();
}else{
return response.text();
}
}).
then(function(results){
if(isJSON){
return immutable?_immutable2.default.fromJS(results):results;
}else{
return results;
}
}).
catch(function(error){
if((error||{}).message==='only absolute urls are supported'){
error=new _APIError2.default([{message:'invalid_url'}],error);
}

error=new _APIError2.default([{message:'network_error'}],error);

_this2.emit('rip_hunter_error',error);
throw error;
});
}},{key:'queryString',value:function queryString(

json){
return Object.keys(json).map(function(key){return encodeURIComponent(key)+'='+encodeURIComponent(json[key]);}).join('&');
}},{key:'toGQL',value:function toGQL(


obj){var _this3=this;
if(_immutable2.default.Iterable.isIterable(obj)){
return this.toGQL(obj.toJS());
}else
if(_lodash2.default.isString(obj)||Array.isArray(obj)){
return JSON.stringify(obj);
}else
if(_lodash2.default.isObject(obj)){
obj=(0,_lodash2.default)(obj).omit(_lodash2.default.isUndefined).omit(_lodash2.default.isNull).value();
var keys=Object.keys(obj);
var props=[];

keys.map(function(k){
var item=obj[k];

if(_lodash2.default.isPlainObject(item)){
props.push(_this3.toGQL(item));
}else
if(_lodash2.default.isArray(item)){
var list=item.map(function(o){
return _this3.toGQL(o);
});

props.push(k+': ['+list.join(', ')+']');
}else{
var val=JSON.stringify(item);

if(val){
props.push(k+': '+val);
}
}
});

var values=props.join(', ');

if(values===''){
return'""';
}else{
return'{'+props.join(', ')+'}';
}
}else{
return obj;
}
}},{key:'query',value:function query(

url,body,options){
body='query '+body;
return this._getGraph(url,body,options);
}},{key:'mutation',value:function mutation(

url,body,options){
body='mutation '+body;
return this._getGraph(url,body,options);
}},{key:'_getGraph',value:function _getGraph(

url,body){var _this4=this;var options=arguments.length>2&&arguments[2]!==undefined?arguments[2]:{};var
headers=options.headers,immutable=options.immutable,token=options.token;
url=url?url.trim():'';
token=(token||'').trim();

if(!headers){
headers={
'Content-Type':'application/graphql',
'Cache-Control':'no-cache'};

}else{
headers={};
}

if(token!==''){
headers.Authorization='Bearer '+token;
}

return fetch(url,{
method:'post',
headers:headers,
body:body}).

then(function(response){
var regex=/application\/json/i;
var isJSON=regex.test(response.headers.get('Content-Type')||'');

if(isJSON){
return response.json();
}else{
return{data:{}};
}
}).
catch(function(error){
if((error||{}).message==='only absolute urls are supported'){
throw new _APIError2.default([{message:'invalid_url'}],error);
}

throw new _APIError2.default([{message:'network_error'}],error);
}).
then(function(json){
if(!json||json.errors){
if(!json){
json={errors:[{message:'api_error'}]};
}else
if((json.errors||[]).some(function(o){return o.message==='Must provide query string.';})){
throw new _APIError2.default([{message:'required_query'}],new Error());
}

throw new _APIError2.default(json.errors,new Error());
}else{
var results=json.data||{};
return immutable?_immutable2.default.fromJS(results):results;
}
}).
catch(function(error){
if(!error.source){
error=new _APIError2.default([{message:'network_error'}],error);
}

_this4.emit('rip_hunter_error',error);
throw error;
});
}},{key:'removeSpaces',value:function removeSpaces(

str){
return str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm,'');
}}]);return Hunter;}(_events2.default);


var hunter=new Hunter();exports.default=
hunter;