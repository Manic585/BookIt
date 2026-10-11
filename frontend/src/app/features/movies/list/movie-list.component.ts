import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MovieService } from '../../../core/services/movie.service';
import { MovieSummary } from '../../../core/models/movie.model';

@Component({
    selector: 'app-movie-list',
    imports: [CommonModule],
    templateUrl: './movie-list.component.html',
    styleUrl: './movie-list.component.css'
})
export class MovieListComponent implements OnInit {
  movies = signal<MovieSummary[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(private movieService: MovieService, private router: Router) {}

  ngOnInit(): void {
    this.movieService.listMovies().subscribe({
      next: movies => {
        this.movies.set(movies);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load movies. Please try again.');
        this.loading.set(false);
      }
    });
  }

  openMovie(movie: MovieSummary): void {
    this.router.navigate(['/movies', movie.id]);
  }
}
