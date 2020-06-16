import { Platform } from '@ionic/angular';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Component, ViewChild, OnInit, ElementRef, AfterViewInit } from '@angular/core';
import * as RecordRTC from 'recordrtc';

declare let cordova: any;
declare let MediaStreamRecorder: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild('video')
  public video: ElementRef;

  @ViewChild('recordedVideo')
  public recordedVideo: ElementRef;

  @ViewChild('canvas')
  public canvas: ElementRef;

  public captures: string[] = [];

  public shouldFaceUser = true;

  public stream: MediaStream = null;

  public track: MediaStreamTrack = null;

  public recorder: any = null;

  public error: any;

  public recordedBlob: Blob = null;

  public constructor(private androidPermissions: AndroidPermissions, private platform: Platform) {}

  public ngOnInit() {}

  public async ngAfterViewInit() {
    this.platform.ready().then(() => {
      if (this.platform.is('cordova') && this.platform.is('android')) {
        this.androidPermissions
          .requestPermissions([
            this.androidPermissions.PERMISSION.CAMERA,
            this.androidPermissions.PERMISSION.MODIFY_AUDIO_SETTINGS,
            this.androidPermissions.PERMISSION.RECORD_AUDIO,
          ])
          .then(() => {
            console.log('permissions asked');
            this.initCamera();
          });
      } else if (this.platform.is('cordova') && this.platform.is('ios')) {
        (cordova.plugins as any).iosrtc.registerGlobals();

        // load adapter.js
        const adapterVersion = 'latest';
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://webrtc.github.io/adapter/adapter-' + adapterVersion + '.js';
        script.async = false;
        document.getElementsByTagName('head')[0].appendChild(script);

        this.initCamera();
      } else {
        this.initCamera();
      }
    });
  }

  public async initCamera() {
    try {
      // navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.shouldFaceUser ? 'user' : 'environment' },
        });
        this.track = this.stream.getVideoTracks()[0];
        this.video.nativeElement.srcObject = this.stream;
        this.video.nativeElement.play();
        // need to make body transparent to be able to have an element in front of the video
        document.body.style.background = 'transparent';
      } else {
        throw new Error('media devices or user media not supported');
      }
    } catch (error) {
      console.error('******');
      console.error(error);
      console.error('******');
      this.error = error;

      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        // required track is missing
        this.error = 'Devices not found';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        // webcam or mic are already in use
        this.error = 'Devices not readable or already in use';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        // constraints can not be satisfied by avb. devices
        this.error = 'Constraints not accepted';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        // permission denied in browser
        this.error = 'Permission denied';
      } else if (error.name === 'TypeError' || error.name === 'TypeError') {
        // empty constraints object
        this.error = 'Constraints error';
      }
    }
  }

  public capture() {
    if (this.platform.is('cordova') && this.platform.is('ios')) {
      this.canvas.nativeElement.getContext('2d').drawImage(this.video.nativeElement, 0, 0, 320, 240);
      const image = new Image();
      image.addEventListener('load', () => {
        this.canvas.nativeElement.width = image.width;
        this.canvas.nativeElement.height = image.height;
        this.canvas.nativeElement.getContext('2d').drawImage(image, 0, 0);
        this.captures.push(this.canvas.nativeElement.toDataURL('image/png'));
      });
      this.video.nativeElement.render.save((data) => {
        image.src = 'data:image/jpg;base64,' + data;
        console.log(JSON.stringify(this.captures));
      });
    } else {
      this.canvas.nativeElement.getContext('2d').drawImage(this.video.nativeElement, 0, 0, 320, 240);
      this.captures.push(this.canvas.nativeElement.toDataURL('image/png'));
    }
  }

  async record() {
    console.log(this.stream);
    this.recorder = new RecordRTC.MediaStreamRecorder(this.stream, {
      type: 'video',
      mimeType: 'video/webm;codecs=h264',
      disableLogs: false,
    });
    this.recorder.record();
  }

  async stopRecording() {
    await this.recorder.stop((blob) => {
      console.log(blob);
      this.recordedBlob = blob;
    });
  }

  public play() {
    this.recordedVideo.nativeElement.src = null;
    this.recordedVideo.nativeElement.srcObject = null;
    this.recordedVideo.nativeElement.src = window.URL.createObjectURL(this.recordedBlob);
    this.recordedVideo.nativeElement.controls = true;
    this.recordedVideo.nativeElement.play();
  }

  public flip() {
    if (this.stream == null) {
      return;
    }
    // we need to flip, stop everything
    this.stream.getTracks().forEach((t) => {
      t.stop();
    });
    // toggle / flip
    this.shouldFaceUser = !this.shouldFaceUser;
    this.initCamera();
  }

  public toggleFlash() {
    this.track
      .applyConstraints({
        advanced: [{ torch: true } as any],
      })
      .catch((e) => console.log(e));
  }
}
