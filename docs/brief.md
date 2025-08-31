**Parking Garage Management Web API**

**Technical Overview:**

**Parking Garage Management System**. 

My client owns a garage and needs a basic **Web API** to manage parking spots and track cars as they enter and exit.

**Research** 

Do initial ultrathink deep web research on parking garage management software and to evaluate design options, trade-offs, and potential extension opportunities this may offer.

Based on your research, create a document with recommendations to be discussed in a follow-up conversation and to be used as the basis for generating the final Product Requirements Document to be used to build the api and web application software

**Project Requirements:**

**Core Features**

**1\. API should support:**

**Garage Layout**:

* Manage *floors* and *bays* (areas within a floor).
* Define and manage *parking spots* with unique identifiers.

**Parking Spot Management**:

* List all parking spots with their availability status (available/occupied).
* Retrieve only available spots.
* Ability to mark spots as occupied or available.

**Car Tracking**:

* Check a car *in*: Assign the car to an available spot.
* Check a car *out*: Free up the spot.

Track check-in and check-out times.

**2\. Minimum Data Fields**

**2a**. **For Parking Spots:**

* Spot ID
* Floor
* Bay
* Spot number
* Status (available/occupied)

**2b. For Cars:**

* License plate number
* Assigned spot ID
* Check-in timestamp

__________________________________________________________________________________________________

**3\. Stretch Goals:**

**Search**:

* Look up a car by license plate.

**Spot Types**:

* Introduce different spot sizes (compact, standard, oversized) and enforce compatibility with car sizes.

**Rate Calculation**:

* Implement basic billing: calculate parking fees based on check-in and check-out times (e.g., an hourly rate).

**Spot Features**:

* Add support for special spot types (e.g., EV charging stations with different pricing).
____________________________________________________________________________________

**General Expectations**
 
**In-memory data storage** (no database required).

**Web API** (RESTful) --- JSON-based input and output.

* No authentication or authorization required.
* Focus on code clarity, structure, and functionality. 
* I will be working with Node.js/Express