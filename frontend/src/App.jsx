import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

            function App() {
              return (
                <div className="container">
                  <header className="hero">
                    <h1>AAHAAR</h1>
                    <p className="tag">Donation Orchestration & Tax Benefit Platform</p>
                    <div className="actions">
                      <a className="btn" href="https://github.com/sss2025initiative/Aahaar" target="_blank" rel="noreferrer">Project Repo</a>
                      <a className="btn ghost" href="https://github.com/Santoshpatel112/Aahaar" target="_blank" rel="noreferrer">Fork (Santoshpatel112)</a>
                    </div>
                  </header>

                  <main>









                    
                    <section className="card">
                      <h2>Features</h2>
                      <ul>
                        <li>User Authentication (Donors, NGOs, Recipients)</li>
                        <li>Food Donation Management</li>
                        <li>Real-time Food Availability Tracking</li>
                        <li>Location-based Food Distribution</li>
                        <li>Contact Information Management</li>
                        <li>Food Category Classification</li>
                        <li>Status Tracking (Pending, In Transit, Delivered)</li>
                      </ul>
                    </section>

                    <section className="card">
                      <h2>Tech Stack</h2>
                      <div className="cols">
                        <div>
                          <h3>Backend</h3>
                          <ul>
                            <li>Node.js / Express</li>
                            <li>MongoDB / Mongoose</li>
                            <li>JWT Authentication</li>
                            <li>AWS S3 for uploads</li>
                          </ul>
                        </div>
                        <div>
                          <h3>Frontend</h3>
                          <ul>
                            <li>React</li>
                            <li>Redux (planned)</li>
                            <li>Material-UI (planned)</li>
                            <li>Axios</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    <section className="card">
                      <h2>Getting Started</h2>
                      <p>Run backend and frontend locally:</p>
                      <pre>
                        <code>
            {`# backend
            cd backend
            npm install
            npm run dev

            # vite frontend (Frontend)
            cd ../Frontend
            npm install
            npm run dev

            # next frontend (frontend)
            cd ../frontend
            npm install
            npm run dev`}
                        </code>
                      </pre>
                    </section>

                    <section className="card small">
                      <h2>API Highlights</h2>
                      <ul>
                        <li>POST /api/foodInfo/createFoodInfo</li>
                        <li>GET /api/foodInfo/getFoodInfo</li>
                        <li>POST /api/users/register</li>
                        <li>POST /api/users/auth</li>
                      </ul>
                    </section>
                  </main>

                  <footer>
                    <small>© AAHAAR — Contribution by Santoshpatel112</small>
                  </footer>
                </div>
              )
            }

            export default App
