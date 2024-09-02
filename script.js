'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const workOut = document.querySelector('.workout');
const btnDelAll = document.querySelector('.btn--delete-workouts');
const overlay = document.querySelector('.overlay');
const overContainer = document.querySelector('.container__overlay');
const btnConfirm = document.querySelector('.btn__left');
const btnreject = document.querySelector('.btn__right');

let workout;
let type;
let distance;
let duration;

// parent class
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); //unique id for each workout
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,log]
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map; //map,mapEvent,workouts and mapzoom are private instant properties
  #mapEvent;
  #workouts = []; //array holding all running or cycling objects
  #mapZoom = 13;
  #selectedWorkoutIndex = -1;
  #sort = false;
  constructor() {
    this.#getPosition();

    form.addEventListener('submit', this.#newWorkout.bind(this));

    inputType.addEventListener('change', this.#toggleElevationField);
    containerWorkouts.addEventListener('click', this.#mapWorkout.bind(this));
    this.#getLocalStorage();
    // sorting workouts
    const sortBtn = document.querySelectorAll('.btn--sort-workouts');
    sortBtn.forEach(workoutSort =>
      workoutSort.addEventListener('click', () => {
        this.#sortWorkouts(this.#workouts, this.#sort);
        // this.#sort = !this.#sort;
      })
    );
  }
  #getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert('Could not get your current position');
        }
      );
  }
  #loadMap(position) {
    const { latitude, longitude } = position.coords; //current location coordinate
    // console.log(`https://www.google.fr/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this.#showForm.bind(this));
    this.#workouts.forEach(work => {
      this.#renderWorkoutMarker(work); //renders markers from local storage
    });
  }
  //handling click on map
  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus(); //for better user experience
    form.style.display = 'grid'; // display form
  }
  #toggleElevationField() {
    //  document.querySelector('.ax').classList.toggle('form__row--hidden');
    //document.querySelector('.ay').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  #newWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    //   get data from the form
    type = inputType.value;
    distance = +inputDistance.value;
    duration = +inputDuration.value;
    // console.log(this.#mapEvent);
    let lat, lng;
    if (this.#selectedWorkoutIndex !== -1) {
      //get lat lng from selected workout
      const selectedWorkout = this.#workouts[this.#selectedWorkoutIndex];
      console.log('###### selected workout ', selectedWorkout);
      lat = selectedWorkout.coords[0];
      lng = selectedWorkout.coords[1];
    } else {
      //get lat lng from map
      lat = this.#mapEvent.latlng.lat;
      lng = this.#mapEvent.latlng.lng;
    }

    //   if workout running create running
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('input have to be positive');
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //   if workout running create cycling
    if (type === 'cycling') {
      // check if data is valid
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(elevation)
      )
        return alert('input have to be positive');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    if (this.#selectedWorkoutIndex !== -1) {
      this.#workouts[this.#selectedWorkoutIndex] = workout;
    } else {
      this.#workouts.push(workout); //if not selected for edit push new workout
    }
    // console.log(this.#workouts);
    // display marker
    this.#renderWorkoutMarker(workout);
    this.#emptyRenderedList();
    // render workout
    this.#workouts.forEach(workout => this.#renderWorkout(workout));

    // clear input fields
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    //set cursor to input distance field
    inputDistance.focus();
    form.style.display = 'none';
    this.#setLocalStorage();
    this.#selectedWorkoutIndex = -1;
  }

  #emptyRenderedList() {
    document.querySelectorAll('li.workout').forEach(workoutEl => {
      workoutEl.remove();
    });
  }

  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <button class="btn--edit-workout" type="button">Edit</button>
          <button class="btn--delete-workout" type="button">&times;</button>
          <h2 class="workout__title"> ${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;
    if (workout.type === 'running') {
      html += ` 
       <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
    // delete workout
    const deleteBtn = document.querySelector('.btn--delete-workout');
    deleteBtn.addEventListener('click', this.#deleteWorkout.bind(this));
    // edit workout
    const btnEdit = document.querySelectorAll('.btn--edit-workout');
    btnEdit.forEach((btn, index) =>
      btn.addEventListener('click', e => this.#editWorkout(e, index))
    );
  }
  #mapWorkout(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl.dataset.id);
    if (!workoutEl) return;

    workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
    //do not set view if delete btn is clicked
    if (!e.target.classList.contains('btn--delete-workout')) {
      this.#map.setView(workout.coords, this.#mapZoom, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }
  }
  // delete workout
  #deleteWorkout(e) {
    const workoutTargetId = e.target.closest('.workout').dataset.id;
    const workoutSearchId = this.#workouts.findIndex(
      workout => workout.id === workoutTargetId
    );
    if (workoutSearchId === -1) return;
    this.#workouts.splice(workoutSearchId, 1);
    this.#setLocalStorage();
    location.reload();
  }

  #fillWorkoutForm(workout) {
    console.log('###### filling workout form');
    inputDistance.value = workout.distance;
    document.getElementsByClassName('form__input--duration')[0].value =
      workout.duration;
    if (workout.type === 'running') {
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
      inputCadence.value = workout.cadence;
    }
    if (workout.type === 'cycling') {
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation.value = workout.elevationGain;
    }
    // document.getElementsByClassName('form__input--cadence')[0].value =
    //   workout.cadence;
  }

  #editWorkout(e, index) {
    // display form
    this.#selectedWorkoutIndex = index;
    form.classList.remove('hidden');
    form.style.display = 'grid';
    const targetworkoutID = e.target.closest('.workout').dataset.id;
    const searchedWorkout = this.#workouts.find(
      workout => workout.id === targetworkoutID
    );
    this.#selectedWorkoutIndex = this.#workouts.findIndex(
      workout => workout.id === targetworkoutID
    );
    if (this.#selectedWorkoutIndex === -1 || searchedWorkout === null) return;

    index = this.#selectedWorkoutIndex;
    console.log('index', index, this.#selectedWorkoutIndex);
    this.#fillWorkoutForm(searchedWorkout);
  }
  #sortWorkouts(workoutSort, sort = false) {
    this.#sort = sort;
    this.#emptyRenderedList();
    if (this.#sort) {
      workoutSort = this.#workouts.slice();
      workoutSort.sort((a, b) => b.distance - a.distance);
      workoutSort.forEach(wk => this.#renderWorkout(wk));
    } else {
      this.#workouts.forEach(workout => this.#renderWorkout(workout));
    }
    this.#sort = !this.#sort;
  }
  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this.#renderWorkout(work);
    });
  }
  reset() {
    btnDelAll.addEventListener('click', function () {
      // display overlay and container
      overlay.classList.remove('hidden');
      overContainer.classList.remove('hidden');
      // confirm delect request
      btnConfirm.addEventListener('click', function () {
        localStorage.removeItem('workouts');
        location.reload();
      });
      // reject delete request
      btnreject.addEventListener('click', () => {
        overContainer.classList.add('hidden');
        overlay.classList.add('hidden');
      });
    });
  }
}
const app = new App();
app.reset();
// const name = 'pangsui';
// console.log(name[0].toUpperCase() + name.slice(1));
