package project

import (
	"github.com/reearth/reearth/server/pkg/id"
)

type ID = id.ProjectID
type TeamID = id.TeamID

var NewID = id.NewProjectID
var NewTeamID = id.NewTeamID

var MustID = id.MustProjectID
var MustTeamID = id.MustTeamID

var IDFrom = id.ProjectIDFrom
var TeamIDFrom = id.TeamIDFrom

var IDFromRef = id.ProjectIDFromRef
var TeamIDFromRef = id.TeamIDFromRef

var ErrInvalidID = id.ErrInvalidID
