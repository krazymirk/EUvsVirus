import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  
  @Output() message = new EventEmitter<string>()

  constructor() { }

  ngOnInit(): void {
  }

  ngOnSendMessage(message):void{
    this.message.emit(message)
  }
}
