import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-view.html',
  styleUrls: ['./home-view.css']
})
export class HomeView {}