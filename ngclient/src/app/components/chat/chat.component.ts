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

  public heads = [];
  constructor() { }

  ngOnInit(): void {
  }

  public setmessage(m: Message){
    const fn = m.name.split(' ').slice(0, -1).join(' ');
    m.message = `${fn || m.name}: ${m.message}`;

    const exst = this.heads.find(h => h.name === m.name);
    if (!exst) {
     this.heads.push(m);
    } else {
      exst.message = m.message;
    }
  }
}
