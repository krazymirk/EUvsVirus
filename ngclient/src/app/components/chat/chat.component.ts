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
      message: 'false'
    },
    {
      name: 'Bohn Boe',
      message: 'false'
    },
    {
      name: 'Nikola A',
      message: 'false'
    },
    {
      name: 'D G',
      message: 'false'
    },
    {
      name: 'John Doe',
      message: 'false'
    },
    {
      name: 'Bohn Boe',
      message: 'false'
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
