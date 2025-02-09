const TMDB_API_KEY = '8cab946fdeb0b1bb39afb9af1f1d3c41'
const STREAMING_API_KEY = 'a23cfae31cmsh1023bb89b0d3744p1935f9jsnc8af498ef288'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const STREAMING_BASE_URL = 'https://streaming-availability.p.rapidapi.com/shows/%7Btype%7D/%7Bid%7D'

const genreSelect = document.getElementById('genre')
const actorInput = document.getElementById('actor')
const actorSuggestions = document.getElementById('actor-suggestions')
const actorGroup = document.getElementById('actor-group')
const recommendButton = document.getElementById('recommend')
const moviesGrid = document.getElementById('movies')

let selectedActorId = null

genreSelect.addEventListener('change', () => {
  if (genreSelect.value) {
    actorGroup.style.display = 'block'
    moviesGrid.innerHTML = ''
  } else {
    actorGroup.style.display = 'none'
    actorInput.value = ''
    selectedActorId = null
  }
})

// Actor input debounce
actorInput.addEventListener('input', debounce(async () => {
  const query = actorInput.value.trim()
  if (query.length > 0) {
    const actors = await searchActors(query)
    displayActorSuggestions(actors)
  } else {
    actorSuggestions.innerHTML = ''
    selectedActorId = null
  }
}, 300))

actorSuggestions.addEventListener('click', (e) => {
  if (e.target && e.target.matches('div.suggestion-item')) {
    actorInput.value = e.target.getAttribute('data-name')
    selectedActorId = e.target.getAttribute('data-id')
    actorSuggestions.innerHTML = ''
  }
})

async function searchActors(query) {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`)
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error searching actors:', error)
    return []
  }
}

function displayActorSuggestions(actors) {
  actorSuggestions.innerHTML = ''
  if (actors.length > 0) {
    const suggestionsList = document.createElement('div')
    suggestionsList.classList.add('suggestions-list')

    actors.forEach(actor => {
      const suggestionItem = document.createElement('div')
      suggestionItem.classList.add('suggestion-item')
      suggestionItem.setAttribute('data-id', actor.id)
      suggestionItem.setAttribute('data-name', actor.name)

      // Actor Image
      const img = document.createElement('img')
      if (actor.profile_path) {
        img.src = `https://image.tmdb.org/t/p/w45${actor.profile_path}`
      } else {
        img.src = 'placeholder.jpg'
      }
      img.alt = actor.name

      const name = document.createElement('span')
      name.textContent = actor.name

      suggestionItem.appendChild(img)
      suggestionItem.appendChild(name)
      suggestionsList.appendChild(suggestionItem)
    })

    actorSuggestions.appendChild(suggestionsList)
  } else {
    actorSuggestions.innerHTML = '<div class="no-suggestions">No actors found.</div>'
  }
}

function debounce(func, delay) {
  let debounceTimer
  return function (...args) {
    const context = this
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => func.apply(context, args), delay)
  }
}

recommendButton.addEventListener('click', async () => {
  const genreId = genreSelect.value
  if (!genreId) {
    alert('Please select a genre.')
    return
  }
  const actorId = selectedActorId || null
  const movies = await fetchMovies(genreId, actorId)
  displayMovies(movies)
})

async function fetchMovies(genreId, actorId) {
  try {
    let apiUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&language=en-US&sort_by=popularity.desc`
    if (actorId) {
      apiUrl += `&with_cast=${actorId}`
    }
    const response = await fetch(apiUrl)
    const data = await response.json()

    return data.results || []
  } catch (error) {
    console.error('Error fetching movies:', error)
    return []
  }
}

async function fetchMovieDetails(movieId) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=external_ids`
    )
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching movie details:', error)
    return null
  }
}

async function fetchStreamingAvailability(imdbID) {
  try {
    const response = await fetch(
      `https://streaming-availability.p.rapidapi.com/get/basic?country=in&imdb_id=${imdbID}&output_language=en`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': STREAMING_API_KEY,
          'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
        },
      }
    )

    if (!response.ok) {
      console.error(`Error fetching streaming availability: ${response.status} ${response.statusText}`)
      return ['Not available']
    }

    const data = await response.json()

    if (data.streamingInfo && data.streamingInfo.in) {
      const services = Object.keys(data.streamingInfo.in)
      return services.length > 0 ? services : ['Not available']
    }

    return ['Not available']
  } catch (error) {
    console.error('Error fetching streaming availability:', error)
    return ['Not available']
  }
}

// Display movies
async function displayMovies(movies) {
  moviesGrid.innerHTML = ''
  if (movies.length === 0) {
    moviesGrid.innerHTML = '<p>No movies found for the selected criteria.</p>'
    return
  }

  for (const movie of movies) {
    const details = await fetchMovieDetails(movie.id)
    if (!details || !details.poster_path || !details.external_ids || !details.external_ids.imdb_id) continue

    const imdbID = details.external_ids.imdb_id

    const streamingAvailability = await fetchStreamingAvailability(imdbID)

    const movieElement = document.createElement('div')
    movieElement.classList.add('movie')
    movieElement.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w500${details.poster_path}" alt="${details.title}">
      <h3>${details.title}</h3>
      <p>${details.overview}</p>
      <p>Rating: ${details.vote_average}</p>
      <p>Available on: ${streamingAvailability.join(', ')}</p>
    `
    moviesGrid.appendChild(movieElement)
  }
}

async function populateGenreDropdown() {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`)
    const data = await response.json()
    const genres = data.genres || []

    genreSelect.innerHTML = '<option value="">-- Select Genre --</option>'

    genres.forEach(genre => {
      const option = document.createElement('option')
      option.value = genre.id
      option.textContent = genre.name
      genreSelect.appendChild(option)
    })
  } catch (error) {
    console.error('Error fetching genres:', error)
  }
}

populateGenreDropdown()

document.addEventListener('click', (e) => {
  if (!actorGroup.contains(e.target)) {
    actorSuggestions.innerHTML = ''
  }
})

let currentFocus = -1

actorInput.addEventListener('keydown', (e) => {
  const suggestionsList = document.querySelector('.suggestions-list')
  if (suggestionsList) {
    const items = suggestionsList.getElementsByClassName('suggestion-item')
    if (e.keyCode === 40) {
      currentFocus++
      addActive(items)
    } else if (e.keyCode === 38) {
      currentFocus--
      addActive(items)
    } else if (e.keyCode === 13) {
      e.preventDefault()
      if (currentFocus > -1) {
        if (items) items[currentFocus].click()
      }
    }
  }
})

function addActive(items) {
  if (!items) return false
  removeActive(items)
  if (currentFocus >= items.length) currentFocus = 0
  if (currentFocus < 0) currentFocus = items.length - 1
  items[currentFocus].classList.add('suggestion-active')
}

function removeActive(items) {
  for (let i = 0; i < items.length; i++) {
    items[i].classList.remove('suggestion-active')
  }
}
