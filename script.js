'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const workOut = document.querySelector('.workout');
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
  constructor() {
    this.#getPosition();

    form.addEventListener('submit', this.#newWorkout.bind(this));

    inputType.addEventListener('change', this.#toggleElevationField);
    containerWorkouts.addEventListener('click', this.#mapWorkout.bind(this));
    this.#getLocalStorage();
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
    const { lat, lng } = this.#mapEvent.latlng;

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
    this.#workouts.push(workout);
    // console.log(this.#workouts);
    // display marker
    this.#renderWorkoutMarker(workout);

    // render workout
    this.#renderWorkout(workout);
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
          <button class="btn--edit-workout" type="button">Edit<button>
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
    // this.#deleteWorkout(workout);

    const btnEdit = document.querySelectorAll('.btn--edit-workout');
    btnEdit.forEach(btn =>
      btn.addEventListener('click', this.#editWorkout.bind(this))
    );

    // delete workout
    const deleteBtn = document.querySelectorAll('.btn--delete-workout');
    deleteBtn.forEach(btn =>
      btn.addEventListener('click', this.#modifyDel.bind(this))
    );
  }
  // delete workout
  #modifyDel() {
    location.reload();
    const workoutIndex = this.#workouts.indexOf(workout);
    this.#workouts.splice(workoutIndex, 1);
    this.#setLocalStorage();
  }

  #editWorkout(mapE) {
    this.#showForm(mapE);
    // display form
    // form.classList.remove('hidden');
    // form.style.display = 'grid';

    // read values from form
    // const type = inputType.value;

    // distance = +inputDistance.value;
    // duration = +inputDuration.value;
    // replace values read with workout object value
    console.log(workout);
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
    const btnDelAll = document.querySelector('.btn--delete-workouts');
    btnDelAll.addEventListener('click', function () {
      localStorage.removeItem('workouts');
      location.reload();
    });
  }
}
const app = new App();
app.reset();
// const name = 'pangsui';
// console.log(name[0].toUpperCase() + name.slice(1));
