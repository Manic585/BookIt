import { Component } from '@angular/core';

import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(public auth: AuthService, private router: Router) {}
}
