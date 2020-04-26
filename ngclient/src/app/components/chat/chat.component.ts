import { Component, OnInit, Input } from '@angular/core';

interface Message {
  name: string;
  message: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})

export class ChatComponent implements OnInit {

  public heads = [
    {
      name: 'John Doe',
      message: 'Hi'
    },
    {
      name: 'Phil James',
      message: 'Hello'
    },
    {
      name: 'Nikola A',
      message: 'Hi'
    },
    {
      name: 'D G',
      message: 'How are you?'
    },
    {
      name: 'John Masters',
      message: 'Hello'
    },
    {
      name: 'Mark Collins',
      message: 'Hi'
    }
];
  constructor() { }

  ngOnInit(): void {
  }

  public setmessage(m: Message){
    const exst = this.heads.find(h => h.name === m.name);
    if (!exst) {
     this.heads.push(m);
    } else {
      exst.message = m.message;
    }
  }
}
