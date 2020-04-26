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
      message: 'John: Hi'
    },
    {
      name: 'Phil James',
      message: 'Phil: Hello'
    },
    {
      name: 'Nikola A',
      message: 'Nikola: Hi'
    },
    {
      name: 'Mark Collins',
      message: 'Mark: How are you?'
    }
];
  constructor() { }

  ngOnInit(): void {
  }

  public setmessage(m: Message){
    const fn = m.name.split(' ').slice(0, -1).join(' ');
    if (fn) {
      m.message = `${fn}: ${m.message}`;
    }
    const exst = this.heads.find(h => h.name === m.name);
    if (!exst) {
     this.heads.push(m);
    } else {
      exst.message = m.message;
    }
  }
}
