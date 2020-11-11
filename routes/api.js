// 'use strict';

// sort out the redirects, add some tests and style

const expect = require('chai').expect;
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const shortid = require('shortid');
const mongoUri = process.env.MONGOURI;
// mongodb connection
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false}).then((con) => {
    console.log("DB connection successful.");
  }).catch((err) => console.log(err));
mongoose.set('debug', true);

module.exports = function (app) {

  // schemas and model

  const issueSchema = new mongoose.Schema({
    _id: {
      type: String,
      required: true
    },
    issue_title: {
      type: String,
      required: true
    },
    issue_text: {
      type: String,
      required: true
    },
    created_on: {
      type: Date,
      required: true
    },
    updated_on: {
      type: Date,
      required: true
    },
    created_by: String,
    assigned_to: String,
    open: Boolean,
    status_text: String
  })

  const projectSchema = new mongoose.Schema({
    project_name: {
      type: String,
      required: true
    },
    issues: [issueSchema]
  })

  const Project = mongoose.model(`projects`, projectSchema);

  app.route('/api/issues/:project')
  
    .get(function (req, res){
      var projectName = req.params.project;
      console.log(projectName)
      
      Project.findOne({project_name: projectName}, (err, result) => {
      if(err) {
        console.log(err)
      } else {
        if (result === null) {
          res.send('Project does not exist. Add it on the homepage')
        } else {
          console.log(result.issues)
          res.json(result.issues)
        }
      }})
    })
    
    // IF PROJECT DOES NOT EXIST CREATE PROJECT + ISSUE
    // IF PROJECT DOES EXIST, ADD ISSUE TO PROJECT
    .post(function (req, res){
      // access form data
      const projectName = req.body.issue_project;
      const issueTitle = req.body.issue_title;
      const issueText = req.body.issue_text;
      const createdBy = req.body.created_by;
      const assignedTo = req.body.assigned_to;
      const statusText = req.body.status_text;
      // check if project exists. add issue if it does, create project and add issue if it does not.

      console.log("HERENOW" + projectName, issueTitle, issueText, createdBy, assignedTo, statusText)

      const newIssue = {
        _id: shortid.generate(),
        issue_title: issueTitle,
        issue_text: issueText,
        created_on: new Date(),
        updated_on: new Date(),
        created_by: createdBy,
        assigned_to: assignedTo,
        open: true,
        status_text: statusText
      }

        Project.findOneAndUpdate({ project_name: projectName }, {upsert: true}, function(err, response){
        if (err) {
          console.log(err);
        } else if (response === null) {
          // create new project and add issue
          const newProject = new Project({
            project_name: projectName,
            issues: []
          }) 
          newProject.save((err, savedProject) => {
            if (err) {
              console.log(err)
            } else {
              console.log("project created and issue added")
              Project.findOneAndUpdate({project_name:savedProject.project_name}, {$push: {issues: newIssue}}, (err, result) => {
                // return;
                //   res.redirect(`/${savedProject.project_name}/`)
              })
            }
          })
         } else if (res !== null) {
           // find existing board and add thread
           console.log("project exists")
           Project.findOneAndUpdate({ project_name: projectName}, {$push: {issues: newIssue}}, (err, result) => {
             if (err) {
               console.log(err)
             } else {
             console.log("issue added to existing project")
             res.redirect(`/${projectName}/`)
             }
           })
         }   
      })

    })
    
  // UPDATE
  // works where project is invalid, project is valid but id issue id is invalid, and where project and issue id are both valid
    .put(function (req, res){
      const projectName = req.body.issue_project;
      const issueId = req.body._id;
      // all update values below are optional.
      // if not filled in they are an empty string ''
      const issueTitle = req.body.issue_title;
      const issueText = req.body.issue_text;
      const createdBy = req.body.created_by;
      const assignedTo = req.body.assigned_to;
      const statusText = req.body.status_text;
      let open = true;
      
      if (req.body.open && req.body.open === "false") {
        open = false;
      }
      // find project
      Project.findOne({project_name: projectName}, (err, project) => {
        if (project === null) {
          return res.send('project does not exist')
        } else {
        const issue = project.issues.id(issueId);
        console.log(issue);
        if (issue === null) {
          return res.send('could not update '+issueId)
        } else {
        issue.set({
          // id - no change
          issue_title: issueTitle === "" ? issue.issue_title : issueTitle,
          issue_text: issueText === "" ? issue.issue_text : issueText,
          // created_on - no change
          updated_on: new Date(),
          created_by: createdBy === "" ? issue.created_by : createdBy,
          assigned_to: assignedTo === "" ? issue.assigned_to : assignedTo,
          open: open,
          status_text: statusText === "" ? issue.status_text : statusText
        })
        project.save();
        res.send('successfully updated')
        }
        }
      });
    })
    
    // DELETE
    // works where project is invalid, project is valid but id issue id is invalid, and where project and issue id are both valid
    .delete(function (req, res){
      const projectName = req.body.issue_project;
      const issueId = req.body._id;

      console.log("DELETE REQ.BODY:"+JSON.stringify(req.body));

      // search the project -- search issue by id -- delete the issue
      Project.findOne({project_name: projectName}, (err, project) => {
        if (project === null) {
          return res.send('project does not exist')
        } else {
        const issue = project.issues.id(issueId);
        console.log(issue);
        if (issue === null) {
          return res.send('could not delete '+issueId)
        } else {
          // delete the issue
          project.issues.pull(issueId);
          console.log('issue deleted');
          project.save();
          res.send('deleted ' + issueId);
        }
        }
     });
    });
    //
}
