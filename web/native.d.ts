interface Window {
  FutureNative?: {
    connect():void;
    selectProvider(provider:string):void;
    openAudioSettings():void;
    disconnect():void;
    capture():void;
    speak(text:string):void;
    stopSpeaking():void;
    listen():void;
    exportJournal(text:string):void;
  };
  onFutureNative?:(event:{type:string,text?:string,data?:string,ready?:boolean})=>void;
}
