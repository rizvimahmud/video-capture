import { Component, ElementRef, ViewChild } from '@angular/core';
import { finalize, map, take, takeWhile, timer } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  public videoElement!: HTMLVideoElement;
  public recordVideoElement!: HTMLVideoElement;
  public mediaVideoRecorder: any;
  public videoRecordedBlobs!: Blob[];
  public isRecording: boolean = false;
  public downloadVideoUrl!: string;
  public stream!: MediaStream;
  public countDown$: any;
  public secondsLeft!: number;

  @ViewChild('recordedVideo') recordVideoElementRef!: ElementRef;
  @ViewChild('liveVideo') videoElementRef!: ElementRef;

  constructor() {}

  startTimer() {
    this.countDown$ = timer(0, 1000)
      .pipe(
        // take(1000),
        takeWhile((x) => x <= 5),
        map((secondsElapsed) => 5 - secondsElapsed),
        finalize(() => {
          this.stopVideoRecording();
        })
      )
      .subscribe((t) => (this.secondsLeft = t));
  }

  async ngOnInit() {
    await this.initRecorder();
  }

  async initRecorder() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 480 },
    });
    this.videoElement = this.videoElementRef.nativeElement;
    this.recordVideoElement = this.recordVideoElementRef.nativeElement;
    this.stream = stream;
    this.videoElement.srcObject = this.stream;
  }

  startVideoRecording() {
    this.startTimer();

    this.videoRecordedBlobs = [];
    let options: any = {
      mimeType: 'video/webm',
    };
    try {
      this.mediaVideoRecorder = new MediaRecorder(this.stream, options);
    } catch (err) {
      console.log(err);
    }
    this.mediaVideoRecorder.start();
    this.isRecording = !this.isRecording;
    this.onDataAvailableVideoEvent();
    this.onStopVideoRecordingEvent();
  }

  stopVideoRecording() {
    this.mediaVideoRecorder.stop();
    this.isRecording = !this.isRecording;
  }

  playRecording() {
    if (!this.videoRecordedBlobs || !this.videoRecordedBlobs.length) {
      return;
    }
    this.recordVideoElement.play();
  }

  onDataAvailableVideoEvent() {
    try {
      this.mediaVideoRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) {
          this.videoRecordedBlobs.push(event.data);
        }
      };
    } catch (error) {
      console.log(error);
    }
  }

  onStopVideoRecordingEvent() {
    try {
      this.mediaVideoRecorder.onstop = (event: Event) => {
        const videoBuffer = new Blob(this.videoRecordedBlobs, {
          type: 'video/webm',
        });
        this.downloadVideoUrl = window.URL.createObjectURL(videoBuffer);
        console.log(this.downloadVideoUrl);
        this.recordVideoElement.src = this.downloadVideoUrl;
      };
    } catch (error) {
      console.log(error);
    }
  }
}
